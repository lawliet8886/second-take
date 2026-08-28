package com.secondtake.verticalslice.data

import com.secondtake.verticalslice.data.remote.CreateSessionRequest
import com.secondtake.verticalslice.data.remote.IntentLockRequest
import com.secondtake.verticalslice.data.remote.RewindRequest
import com.secondtake.verticalslice.data.remote.SecondTakeApi
import com.secondtake.verticalslice.data.remote.TurnRequest
import com.secondtake.verticalslice.domain.BackendOutcome
import com.secondtake.verticalslice.domain.ConversationRepository
import com.secondtake.verticalslice.domain.LocaleTag

class RemoteConversationRepository(private val api: SecondTakeApi) : ConversationRepository {
    override suspend fun health() = api.health()
    override suspend fun ready() = api.ready()
    override suspend fun startSession(locale: LocaleTag) = BackendMapper.session(api.createSession(CreateSessionRequest(locale.value)))
    override suspend fun getSession(sessionId: String) = BackendMapper.session(api.getSession(sessionId))
    override suspend fun sendTurn(sessionId: String, text: String, clientTurnId: String) = BackendMapper.outcome(api.sendTurn(sessionId, TurnRequest(text, clientTurnId)))
    override suspend fun confirmIntent(sessionId: String, turnId: String, confirmedIntent: String): BackendOutcome.AlexReply {
        return BackendMapper.outcome(api.confirmIntent(sessionId, IntentLockRequest(turnId, confirmedIntent))) as? BackendOutcome.AlexReply
            ?: throw IllegalStateException("Intent Lock did not resolve to Alex")
    }
    override suspend fun rewind(sessionId: String, snapshotId: String) = BackendMapper.session(api.rewind(sessionId, RewindRequest(snapshotId)))
}
