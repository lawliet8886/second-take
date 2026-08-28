package com.secondtake.verticalslice.domain

interface ConversationRepository {
    suspend fun health(): Boolean
    suspend fun ready(): Boolean
    suspend fun startSession(locale: LocaleTag): PublicConversation
    suspend fun getSession(sessionId: String): PublicConversation
    suspend fun sendTurn(sessionId: String, text: String, clientTurnId: String): BackendOutcome
    suspend fun confirmIntent(sessionId: String, turnId: String, confirmedIntent: String): BackendOutcome.AlexReply
    suspend fun rewind(sessionId: String, snapshotId: String): PublicConversation
}
