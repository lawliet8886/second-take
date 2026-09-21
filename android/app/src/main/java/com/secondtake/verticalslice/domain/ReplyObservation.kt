package com.secondtake.verticalslice.domain

enum class ReplyObservation { CLARIFICATION, SOURCES_BY_NINE, SOURCES_PROPOSAL, UNCLASSIFIED }

/**
 * An exact allowlist of visible authored replies, not an intent or sentiment classifier.
 * Unknown, extended, or modified replies receive no specific interpretation.
 * This function cannot inspect hidden facts, user input, branch identity, or provider state.
 */
fun observeReply(reply: String): ReplyObservation = when (reply) {
    "What do you mean exactly?",
    "Can you be more specific?",
    "Which part are you asking about?",
    "Help me understand what you mean.",
    "O que você quer dizer exatamente?",
    "Você pode ser mais específico?",
    "De qual parte você está falando?",
    "Me ajuda a entender o que você quer dizer." -> ReplyObservation.CLARIFICATION

    "I can finish the sources by nine tonight.",
    "I can get the sources done by nine tonight.",
    "The sources are something I can finish by nine tonight.",
    "I can have the sources ready by nine tonight.",
    "Consigo terminar as fontes até as nove hoje.",
    "Dá pra eu fechar as fontes até as nove hoje.",
    "Eu consigo deixar as fontes prontas até as nove hoje.",
    "As fontes eu consigo terminar até as nove hoje." -> ReplyObservation.SOURCES_BY_NINE

    "I'll finish the sources by nine tonight.",
    "I can take the sources and have them done by nine tonight.",
    "My proposal is simple: I'll deliver the sources by nine tonight.",
    "Let me finish the sources by nine tonight.",
    "Eu termino as fontes até as nove hoje.",
    "Eu fico com as fontes e entrego até as nove hoje.",
    "Minha proposta é simples: eu entrego as fontes até as nove hoje.",
    "Deixa as fontes comigo que eu termino até as nove hoje." -> ReplyObservation.SOURCES_PROPOSAL

    else -> ReplyObservation.UNCLASSIFIED
}
