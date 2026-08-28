package com.secondtake.verticalslice.ui

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.secondtake.verticalslice.data.ScenarioRepository
import com.secondtake.verticalslice.domain.BackendOutcome
import com.secondtake.verticalslice.domain.BranchPresentation
import com.secondtake.verticalslice.domain.ConnectedComparison
import com.secondtake.verticalslice.domain.ConversationClientError
import com.secondtake.verticalslice.domain.ConversationRepository
import com.secondtake.verticalslice.domain.IntentOption
import com.secondtake.verticalslice.domain.LocaleContract
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.MessageRole
import com.secondtake.verticalslice.domain.PublicConversation
import com.secondtake.verticalslice.domain.SelectionSource
import com.secondtake.verticalslice.domain.VisibleMessage
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

sealed interface ConversationUiStatus {
    data object Intro : ConversationUiStatus
    data object Initializing : ConversationUiStatus
    data object Ready : ConversationUiStatus
    data object SendingTurn : ConversationUiStatus
    data class WaitingForIntentLock(val turnId:String,val options:List<IntentOption>) : ConversationUiStatus
    data object WaitingForAlex : ConversationUiStatus
    data object Rewinding : ConversationUiStatus
    data class RecoverableNetworkError(val kind:ErrorKind,val canRetry:Boolean) : ConversationUiStatus
}
enum class ErrorKind { CONNECTION, TIMEOUT, SESSION_LOST, HTTP, DECODING, PROVIDER_RECOVERY }
private sealed interface PendingOperation {
    data class Turn(val text:String,val clientTurnId:String):PendingOperation
    data class Intent(val turnId:String,val intent:String):PendingOperation
    data class Rewind(val snapshotId:String):PendingOperation
}

data class ConnectedUiState(
    val localeContract:LocaleContract,
    val status:ConversationUiStatus=ConversationUiStatus.Intro,
    val conversation:PublicConversation?=null,
    val pendingMessage:VisibleMessage?=null,
    val inputText:String="",
    val intervention:String?=null,
    val lastSelectionSource:SelectionSource?=null,
    val rewindTargetTurnId:String?=null,
    val restoredCheckpoint:Boolean=false,
    val comparison:ConnectedComparison?=null,
    val showComparison:Boolean=false,
) {
    val displayMessages:List<VisibleMessage> get() {
        val remote=conversation?.messages.orEmpty()
        val pending=pendingMessage
        return if(pending==null||remote.any{it.turnId==pending.turnId||it.id==pending.id})remote else remote+pending
    }
}

class ConnectedConversationViewModel(
    private val savedStateHandle:SavedStateHandle,
    private val repository:ConversationRepository,
):ViewModel(){
    private var pendingOperation:PendingOperation?=null
    private var branchACapture:List<VisibleMessage>?=null
    private var restoredMessageCount=0
    private val initialLocale=safeLocale(savedStateHandle[KEY_LOCALE])
    private val _uiState=MutableStateFlow(ConnectedUiState(LocaleContract(initialLocale,initialLocale),status=if(savedStateHandle.get<String>(KEY_SESSION_ID)==null)ConversationUiStatus.Intro else ConversationUiStatus.Initializing))
    val uiState:StateFlow<ConnectedUiState> = _uiState.asStateFlow()

    init { savedStateHandle.get<String>(KEY_SESSION_ID)?.let(::rehydrate) }

    fun setLocale(locale:LocaleTag){if(_uiState.value.conversation!=null)return;savedStateHandle[KEY_LOCALE]=locale.value;_uiState.value=_uiState.value.copy(localeContract=LocaleContract(locale,locale))}
    fun updateInput(value:String){_uiState.value=_uiState.value.copy(inputText=value.take(4_000))}

    fun startSession(){
        if(_uiState.value.status !is ConversationUiStatus.Intro && _uiState.value.status !is ConversationUiStatus.RecoverableNetworkError)return
        _uiState.value=_uiState.value.copy(status=ConversationUiStatus.Initializing,intervention=null)
        viewModelScope.launch{runCatching{repository.startSession(_uiState.value.localeContract.conversationLanguage)}.onSuccess(::acceptSession).onFailure{handleFailure(it,null)}}
    }

    fun sendTurn(){
        val text=_uiState.value.inputText.trim();if(text.isEmpty()||_uiState.value.status !is ConversationUiStatus.Ready)return
        executeTurn(PendingOperation.Turn(text,UUID.randomUUID().toString()))
    }

    fun confirmIntent(turnId:String,intent:String){if(_uiState.value.status !is ConversationUiStatus.WaitingForIntentLock)return;executeIntent(PendingOperation.Intent(turnId,intent))}

    fun rewind(){
        val snapshotId=_uiState.value.rewindTargetTurnId?:return
        if(_uiState.value.status !is ConversationUiStatus.Ready)return
        branchACapture=_uiState.value.conversation?.messages
        executeRewind(PendingOperation.Rewind(snapshotId))
    }

    fun retry(){when(val operation=pendingOperation){is PendingOperation.Turn->executeTurn(operation);is PendingOperation.Intent->executeIntent(operation);is PendingOperation.Rewind->executeRewind(operation);null->if(_uiState.value.conversation==null)startSession()}}
    fun dismissIntervention(){_uiState.value=_uiState.value.copy(intervention=null,status=if(_uiState.value.conversation==null)ConversationUiStatus.Intro else ConversationUiStatus.Ready);pendingOperation=null}
    fun showComparison(){if(_uiState.value.comparison!=null)_uiState.value=_uiState.value.copy(showComparison=true)}
    fun hideComparison(){_uiState.value=_uiState.value.copy(showComparison=false)}
    fun restart(){savedStateHandle.remove<String>(KEY_SESSION_ID);branchACapture=null;restoredMessageCount=0;pendingOperation=null;_uiState.value=ConnectedUiState(_uiState.value.localeContract)}

    private fun executeTurn(operation:PendingOperation.Turn){
        val session=_uiState.value.conversation?:return;pendingOperation=operation
        val optimistic=VisibleMessage("pending-${operation.clientTurnId}",MessageRole.USER,operation.text,operation.clientTurnId,pending=true)
        _uiState.value=_uiState.value.copy(status=ConversationUiStatus.SendingTurn,pendingMessage=optimistic,inputText="",intervention=null)
        viewModelScope.launch{runCatching{repository.sendTurn(session.sessionId,operation.text,operation.clientTurnId)}.onSuccess(::acceptOutcome).onFailure{handleFailure(it,operation)}}
    }

    private fun executeIntent(operation:PendingOperation.Intent){
        val session=_uiState.value.conversation?:return;pendingOperation=operation;_uiState.value=_uiState.value.copy(status=ConversationUiStatus.WaitingForAlex,intervention=null)
        viewModelScope.launch{runCatching{repository.confirmIntent(session.sessionId,operation.turnId,operation.intent)}.onSuccess(::acceptOutcome).onFailure{handleFailure(it,operation)}}
    }

    private fun executeRewind(operation:PendingOperation.Rewind){
        val session=_uiState.value.conversation?:return;pendingOperation=operation;_uiState.value=_uiState.value.copy(status=ConversationUiStatus.Rewinding,intervention=null)
        viewModelScope.launch{
            val started=System.currentTimeMillis();runCatching{repository.rewind(session.sessionId,operation.snapshotId)}.onSuccess{restored->
                val wait=(900-(System.currentTimeMillis()-started)).coerceAtLeast(0);delay(wait)
                val branchMessages=branchACapture.orEmpty().drop(restored.messages.size)
                val user=branchMessages.firstOrNull({it.role==MessageRole.USER})?.text.orEmpty()
                val alex=branchMessages.firstOrNull({it.role==MessageRole.ALEX})?.text.orEmpty()
                val branchA=BranchPresentation(session.activeBranch,branchACapture.orEmpty(),user,alex);restoredMessageCount=restored.messages.size
                _uiState.value=_uiState.value.copy(status=ConversationUiStatus.Ready,conversation=restored,pendingMessage=null,rewindTargetTurnId=null,restoredCheckpoint=true,comparison=_uiState.value.comparison?.copy(restoredMessageCount=restoredMessageCount,branchA=branchA)?:ConnectedComparison(restoredMessageCount,branchA,branchA),showComparison=false)
                savedStateHandle[KEY_SESSION_ID]=restored.sessionId;pendingOperation=null
            }.onFailure{handleFailure(it,operation)}
        }
    }

    private fun acceptOutcome(outcome:BackendOutcome){
        pendingOperation=null
        when(outcome){
            is BackendOutcome.AlexReply->{
                var comparison=_uiState.value.comparison
                if(_uiState.value.restoredCheckpoint&&comparison!=null){
                    val delta=outcome.conversation.messages.drop(restoredMessageCount)
                    val branchB=BranchPresentation(outcome.conversation.activeBranch,outcome.conversation.messages,delta.firstOrNull({it.role==MessageRole.USER})?.text.orEmpty(),delta.firstOrNull({it.role==MessageRole.ALEX})?.text.orEmpty())
                    comparison=comparison.copy(branchB=branchB)
                }
                _uiState.value=_uiState.value.copy(status=ConversationUiStatus.Ready,conversation=outcome.conversation,pendingMessage=null,lastSelectionSource=outcome.selectionSource,rewindTargetTurnId=if(_uiState.value.restoredCheckpoint)null else outcome.turnId,comparison=comparison,intervention=null)
            }
            is BackendOutcome.IntentLockRequired->_uiState.value=_uiState.value.copy(status=ConversationUiStatus.WaitingForIntentLock(outcome.turnId,outcome.options),conversation=outcome.conversation,pendingMessage=null,intervention=null)
            is BackendOutcome.OutOfScope->_uiState.value=_uiState.value.copy(status=ConversationUiStatus.Ready,conversation=outcome.conversation,pendingMessage=null,intervention=outcome.intervention.ifBlank{localizedOos()})
            is BackendOutcome.TransportRecovery->_uiState.value=_uiState.value.copy(status=ConversationUiStatus.RecoverableNetworkError(ErrorKind.PROVIDER_RECOVERY,false),conversation=outcome.conversation,pendingMessage=null,intervention=localizedProviderRecovery())
        }
        savedStateHandle[KEY_SESSION_ID]=outcome.conversation.sessionId
    }

    private fun acceptSession(session:PublicConversation){savedStateHandle[KEY_SESSION_ID]=session.sessionId;pendingOperation=null;val status=if(session.pendingIntentLockTurnId!=null&&session.pendingIntentLockOptions.isNotEmpty())ConversationUiStatus.WaitingForIntentLock(session.pendingIntentLockTurnId,session.pendingIntentLockOptions) else ConversationUiStatus.Ready;_uiState.value=_uiState.value.copy(status=status,conversation=session,pendingMessage=null,intervention=null)}
    private fun rehydrate(sessionId:String){viewModelScope.launch{runCatching{repository.getSession(sessionId)}.onSuccess(::acceptSession).onFailure{handleFailure(it,null)}}}
    private fun handleFailure(error:Throwable,operation:PendingOperation?){pendingOperation=operation;val kind=when(error){is ConversationClientError.Timeout->ErrorKind.TIMEOUT;is ConversationClientError.SessionLost->ErrorKind.SESSION_LOST;is ConversationClientError.Http->ErrorKind.HTTP;is ConversationClientError.Decoding->ErrorKind.DECODING;else->ErrorKind.CONNECTION};if(kind==ErrorKind.SESSION_LOST)savedStateHandle.remove<String>(KEY_SESSION_ID);_uiState.value=_uiState.value.copy(status=ConversationUiStatus.RecoverableNetworkError(kind,operation!=null||_uiState.value.conversation==null),intervention=localizedNetworkError(kind))}
    private fun localizedOos()=if(_uiState.value.localeContract.interfaceLanguage==ScenarioRepository.PortugueseBrazil)"Este treino funciona melhor quando a fala está ligada à conversa com Alex." else "This practice works best when your message stays connected to the conversation with Alex."
    private fun localizedProviderRecovery()=if(_uiState.value.localeContract.interfaceLanguage==ScenarioRepository.PortugueseBrazil)"Não consegui continuar esta fala agora. Você pode tentar uma nova mensagem." else "This turn could not continue right now. You can try a new message."
    private fun localizedNetworkError(kind:ErrorKind)=if(_uiState.value.localeContract.interfaceLanguage==ScenarioRepository.PortugueseBrazil)when(kind){ErrorKind.SESSION_LOST->"A sessão local foi encerrada. Inicie um novo treino.";else->"Não consegui falar com o Second Take agora."}else when(kind){ErrorKind.SESSION_LOST->"The local session ended. Start a new practice.";else->"Second Take could not be reached right now."}
    private fun safeLocale(raw:String?)=if(raw==ScenarioRepository.PortugueseBrazil.value)ScenarioRepository.PortugueseBrazil else ScenarioRepository.English
    companion object{private const val KEY_SESSION_ID="backend_session_id";private const val KEY_LOCALE="connected_locale"}
}
