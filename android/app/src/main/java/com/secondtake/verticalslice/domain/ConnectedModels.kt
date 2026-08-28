package com.secondtake.verticalslice.domain

enum class MessageRole { USER, ALEX }

data class VisibleMessage(
    val id: String,
    val role: MessageRole,
    val text: String,
    val turnId: String,
    val pending: Boolean = false,
)

data class IntentOption(
    val intent: String,
    val label: String,
)

data class PublicConversation(
    val sessionId: String,
    val locale: LocaleTag,
    val messages: List<VisibleMessage>,
    val revealedFactIds: Set<String>,
    val activeBranch: String,
    val pendingIntentLockTurnId: String? = null,
    val pendingIntentLockOptions: List<IntentOption> = emptyList(),
)

sealed interface BackendOutcome {
    val turnId: String
    val conversation: PublicConversation

    data class AlexReply(
        override val turnId: String,
        override val conversation: PublicConversation,
        val message: VisibleMessage,
        val selectionSource: SelectionSource,
    ) : BackendOutcome

    data class IntentLockRequired(
        override val turnId: String,
        override val conversation: PublicConversation,
        val options: List<IntentOption>,
    ) : BackendOutcome

    data class OutOfScope(
        override val turnId: String,
        override val conversation: PublicConversation,
        val intervention: String,
    ) : BackendOutcome

    data class TransportRecovery(
        override val turnId: String,
        override val conversation: PublicConversation,
        val message: String,
    ) : BackendOutcome
}

enum class SelectionSource { REMOTE, LOCAL_FALLBACK }

sealed class ConversationClientError(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class Connection(cause: Throwable) : ConversationClientError("BACKEND_CONNECTION", cause)
    class Timeout(cause: Throwable) : ConversationClientError("BACKEND_TIMEOUT", cause)
    class Http(val status: Int, val code: String?) : ConversationClientError("BACKEND_HTTP_$status")
    class Decoding(cause: Throwable) : ConversationClientError("BACKEND_DECODING", cause)
    data object SessionLost : ConversationClientError("BACKEND_SESSION_LOST")
}

data class BranchPresentation(
    val branchId: String,
    val messages: List<VisibleMessage>,
    val userChoice: String,
    val alexReply: String,
)

data class ConnectedComparison(
    val restoredMessageCount: Int,
    val branchA: BranchPresentation,
    val branchB: BranchPresentation,
)
