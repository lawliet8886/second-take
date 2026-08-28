package com.secondtake.verticalslice.ui

import androidx.lifecycle.SavedStateHandle
import com.secondtake.verticalslice.domain.BackendOutcome
import com.secondtake.verticalslice.domain.ConversationClientError
import com.secondtake.verticalslice.domain.ConversationRepository
import com.secondtake.verticalslice.domain.IntentOption
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.MessageRole
import com.secondtake.verticalslice.domain.PublicConversation
import com.secondtake.verticalslice.domain.SelectionSource
import com.secondtake.verticalslice.domain.VisibleMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ConnectedConversationViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    @Before fun setup() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun `network retry reuses client turn id and never duplicates optimistic message`() = runTest(dispatcher) {
        val fake = FakeRepository().apply { failNext = true }
        val vm = ConnectedConversationViewModel(SavedStateHandle(), fake)
        vm.startSession(); advanceUntilIdle()
        vm.updateInput("Oi Alex"); vm.sendTurn(); advanceUntilIdle()
        val id = fake.turnCalls.single().third
        assertTrue(vm.uiState.value.status is ConversationUiStatus.RecoverableNetworkError)
        assertEquals(1, vm.uiState.value.displayMessages.count { it.pending })
        vm.retry(); advanceUntilIdle()
        assertEquals(listOf(id, id), fake.turnCalls.map { it.third })
        assertEquals(1, vm.uiState.value.conversation!!.messages.count { it.role == MessageRole.USER })
    }

    @Test fun `intent confirmation is metadata and original user text stays unchanged`() = runTest(dispatcher) {
        val fake = FakeRepository().apply { lockNext = true }
        val vm = ConnectedConversationViewModel(SavedStateHandle(), fake)
        vm.startSession(); advanceUntilIdle(); vm.updateInput("Você consegue terminar hoje?"); vm.sendTurn(); advanceUntilIdle()
        val status = vm.uiState.value.status as ConversationUiStatus.WaitingForIntentLock
        vm.confirmIntent(status.turnId, "REQUEST_COMPLETION"); advanceUntilIdle()
        assertEquals("Você consegue terminar hoje?", vm.uiState.value.conversation!!.messages.first().text)
        assertEquals("REQUEST_COMPLETION", fake.confirmedIntent)
        assertEquals(2, vm.uiState.value.conversation!!.messages.size)
    }

    @Test fun `saved session rehydrates pending intent lock`() = runTest(dispatcher) {
        val fake = FakeRepository().apply { session = baseSession().copy(pendingIntentLockTurnId="t1", pendingIntentLockOptions=options) }
        val vm = ConnectedConversationViewModel(SavedStateHandle(mapOf("backend_session_id" to "s1")), fake)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.status is ConversationUiStatus.WaitingForIntentLock)
    }

    @Test fun `rewind is backend authoritative and builds branch comparison`() = runTest(dispatcher) {
        val fake = FakeRepository()
        val vm = ConnectedConversationViewModel(SavedStateHandle(), fake)
        vm.startSession(); advanceUntilIdle(); vm.updateInput("primeira escolha"); vm.sendTurn(); advanceUntilIdle()
        vm.rewind(); advanceUntilIdle()
        assertTrue(vm.uiState.value.restoredCheckpoint)
        assertEquals(0, vm.uiState.value.conversation!!.messages.size)
        assertEquals("t1", fake.rewindSnapshot)
        vm.updateInput("segunda escolha"); vm.sendTurn(); advanceUntilIdle()
        assertFalse(vm.uiState.value.comparison!!.branchB.userChoice.isBlank())
    }

    private class FakeRepository : ConversationRepository {
        var session = baseSession()
        var failNext = false
        var lockNext = false
        val turnCalls = mutableListOf<Triple<String,String,String>>()
        var confirmedIntent: String? = null
        var rewindSnapshot: String? = null
        override suspend fun health()=true
        override suspend fun ready()=true
        override suspend fun startSession(locale:LocaleTag)=session.copy(locale=locale)
        override suspend fun getSession(sessionId:String)=session
        override suspend fun sendTurn(sessionId:String,text:String,clientTurnId:String):BackendOutcome {
            turnCalls += Triple(sessionId,text,clientTurnId)
            if(failNext){failNext=false;throw ConversationClientError.Connection(IllegalStateException("offline"))}
            val user=VisibleMessage("u-${turnCalls.size}",MessageRole.USER,text,"t${turnCalls.size}")
            session=session.copy(messages=session.messages+user)
            if(lockNext){lockNext=false;session=session.copy(pendingIntentLockTurnId=user.turnId,pendingIntentLockOptions=options);return BackendOutcome.IntentLockRequired(user.turnId,session,options)}
            return reply(user.turnId)
        }
        override suspend fun confirmIntent(sessionId:String,turnId:String,confirmedIntent:String):BackendOutcome.AlexReply {this.confirmedIntent=confirmedIntent;return reply(turnId)}
        override suspend fun rewind(sessionId:String,snapshotId:String):PublicConversation {rewindSnapshot=snapshotId;session=session.copy(messages=emptyList(),activeBranch="branch-b");return session}
        private fun reply(turnId:String):BackendOutcome.AlexReply {val alex=VisibleMessage("a-${turnCalls.size}",MessageRole.ALEX,"Alex respondeu",turnId);session=session.copy(messages=session.messages+alex,pendingIntentLockTurnId=null,pendingIntentLockOptions=emptyList());return BackendOutcome.AlexReply(turnId,session,alex,SelectionSource.REMOTE)}
    }

    companion object {
        private val options=listOf(IntentOption("ASK_CAPABILITY","Saber se consegue"),IntentOption("REQUEST_COMPLETION","Pedir que faça"))
        private fun baseSession()=PublicConversation("s1",LocaleTag("pt-BR"),emptyList(),emptySet(),"main")
    }
}
