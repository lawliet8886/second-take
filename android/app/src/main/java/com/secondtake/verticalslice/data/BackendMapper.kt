package com.secondtake.verticalslice.data

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.secondtake.verticalslice.data.remote.MessageDto
import com.secondtake.verticalslice.data.remote.PublicSessionDto
import com.secondtake.verticalslice.data.remote.TurnResponseDto
import com.secondtake.verticalslice.domain.BackendOutcome
import com.secondtake.verticalslice.domain.ConversationClientError
import com.secondtake.verticalslice.domain.IntentOption
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.MessageRole
import com.secondtake.verticalslice.domain.PublicConversation
import com.secondtake.verticalslice.domain.SelectionSource
import com.secondtake.verticalslice.domain.VisibleMessage

object BackendMapper {
    private val gson = Gson()

    fun session(dto: PublicSessionDto) = PublicConversation(
        sessionId = dto.sessionId,
        locale = LocaleTag(dto.locale),
        messages = dto.messages.map(::message),
        revealedFactIds = dto.revealedFactIds.toSet(),
        activeBranch = dto.activeBranch,
        pendingIntentLockTurnId = dto.pendingIntentLock?.turnId,
        pendingIntentLockOptions = dto.pendingIntentLock?.options.orEmpty().map { IntentOption(it.intent, it.label) },
    )

    fun outcome(dto: TurnResponseDto): BackendOutcome {
        val publicState = dto.publicState ?: throw ConversationClientError.Decoding(IllegalStateException("Missing publicState"))
        val conversation = session(publicState)
        return when (dto.type) {
            "ALEX_REPLY", "RECOVERY_FALLBACK" -> {
                val reply = dto.message?.let(::messageObject) ?: throw ConversationClientError.Decoding(IllegalStateException("Missing Alex message"))
                BackendOutcome.AlexReply(
                    turnId = dto.turnId,
                    conversation = conversation,
                    message = reply,
                    selectionSource = if (dto.selectionSource == "LOCAL_FALLBACK" || dto.type == "RECOVERY_FALLBACK") SelectionSource.LOCAL_FALLBACK else SelectionSource.REMOTE,
                )
            }
            "INTENT_LOCK_REQUIRED" -> BackendOutcome.IntentLockRequired(
                turnId = dto.turnId,
                conversation = conversation,
                options = dto.options.map { IntentOption(it.intent, it.label) },
            )
            "OUT_OF_SCOPE" -> BackendOutcome.OutOfScope(dto.turnId, conversation, dto.message.textValue())
            "TRANSPORT_FAILURE" -> BackendOutcome.TransportRecovery(dto.turnId, conversation, dto.message.textValue())
            else -> throw ConversationClientError.Decoding(IllegalArgumentException("Unknown outcome type"))
        }
    }

    private fun message(dto: com.secondtake.verticalslice.data.remote.MessageDto) = VisibleMessage(
        id = dto.id,
        role = when (dto.role) { "USER" -> MessageRole.USER; "ALEX" -> MessageRole.ALEX; else -> throw ConversationClientError.Decoding(IllegalArgumentException("Unknown role")) },
        text = dto.text,
        turnId = dto.turnId,
    )

    private fun messageObject(element: JsonElement): VisibleMessage {
        if (!element.isJsonObject) throw ConversationClientError.Decoding(IllegalArgumentException("Expected message object"))
        return message(gson.fromJson(element, MessageDto::class.java))
    }

    private fun JsonElement?.textValue(): String = when {
        this == null || isJsonNull -> ""
        isJsonPrimitive && asJsonPrimitive.isString -> asString
        isJsonObject -> runCatching { gson.fromJson(this, MessageDto::class.java).text }.getOrDefault("")
        else -> ""
    }
}
