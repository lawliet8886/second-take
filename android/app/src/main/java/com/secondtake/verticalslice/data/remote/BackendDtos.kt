package com.secondtake.verticalslice.data.remote

import com.google.gson.JsonElement

data class CreateSessionRequest(val locale: String)
data class TurnRequest(val text: String, val clientTurnId: String)
data class IntentLockRequest(val turnId: String, val confirmedIntent: String)
data class RewindRequest(val snapshotId: String)

data class MessageDto(val id: String = "", val role: String = "", val text: String = "", val turnId: String = "")
data class IntentOptionDto(val id: String = "", val intent: String = "", val label: String = "", val routerSuggested: Boolean = false)
data class PendingIntentLockDto(val turnId: String = "", val options: List<IntentOptionDto> = emptyList())
data class PublicSessionDto(
    val sessionId: String = "",
    val scenarioId: String = "",
    val locale: String = "en-US",
    val messages: List<MessageDto> = emptyList(),
    val revealedFactIds: List<String> = emptyList(),
    val activeBranch: String = "main",
    val pendingIntentLock: PendingIntentLockDto? = null,
)
data class TurnResponseDto(
    val type: String = "",
    val turnId: String = "",
    val message: JsonElement? = null,
    val options: List<IntentOptionDto> = emptyList(),
    val publicState: PublicSessionDto? = null,
    val selectionSource: String? = null,
)
data class ErrorEnvelopeDto(val error: BackendErrorDto? = null)
data class BackendErrorDto(val code: String? = null, val message: String? = null)
