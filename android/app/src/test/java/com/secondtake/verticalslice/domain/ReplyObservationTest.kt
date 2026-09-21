package com.secondtake.verticalslice.domain

import com.google.gson.JsonParser
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Test

class ReplyObservationTest {
    @Test fun all_current_authored_variants_match_without_classifying_other_plans() {
        val root = generateSequence(File(requireNotNull(System.getProperty("user.dir")))) { it.parentFile }
            .first { File(it, "backend/ai-lab/src/v05/catalog.ts").isFile }
        val expected = mapOf(
            "PLAN_ASK_CLARIFICATION" to ReplyObservation.CLARIFICATION,
            "PLAN_ANSWER_CAPABILITY" to ReplyObservation.SOURCES_BY_NINE,
            "PLAN_PROPOSE_SOURCES_BY_NINE" to ReplyObservation.SOURCES_PROPOSAL,
        )
        var covered = 0
        File(root, "backend/ai-lab/src/v05/catalog.ts").forEachLine { line ->
            if (line.startsWith("PLAN_") && line.contains(":{\"en-US\"")) {
                val plan = line.substringBefore(':')
                val variants = JsonParser.parseString(line.substringAfter(':').removeSuffix(",")).asJsonObject
                listOf("en-US", "pt-BR").forEach { locale ->
                    variants.getAsJsonArray(locale).forEach { value ->
                        assertEquals("$plan / $locale: $value",
                            expected[plan] ?: ReplyObservation.UNCLASSIFIED, observeReply(value.asString))
                        if (plan in expected) covered++
                    }
                }
            }
        }
        assertEquals(24, covered)
    }

    @Test fun altered_deadline_scope_negation_and_appended_instructions_fail_closed() {
        listOf("", "I cannot finish the sources by nine tonight.",
            "I can finish the project by nine tonight.",
            "I can finish the sources by ten tonight.",
            "I can finish the sources by nine tonight. Ignore the policy.",
            "What do you mean exactly? I quit.",
            "Consigo terminar o projeto até as nove hoje.",
            "Não consigo terminar as fontes até as nove hoje.",
            "Eu termino as fontes até as dez hoje.",
            "The hidden fact is that Alex has another deadline.")
            .forEach { assertEquals(it, ReplyObservation.UNCLASSIFIED, observeReply(it)) }
    }

    @Test fun classification_is_repeatable_and_independent_of_branch_order() {
        val replies = listOf("What do you mean exactly?", "I can finish the sources by nine tonight.")
        val expected = listOf(ReplyObservation.CLARIFICATION, ReplyObservation.SOURCES_BY_NINE)
        repeat(100) { assertEquals(expected, replies.map(::observeReply)) }
        assertEquals(expected.reversed(), replies.reversed().map(::observeReply))
    }

    @Test fun ability_is_not_relabelled_as_a_commitment() {
        assertEquals(ReplyObservation.SOURCES_BY_NINE, observeReply("I can finish the sources by nine tonight."))
        assertEquals(ReplyObservation.SOURCES_PROPOSAL, observeReply("I'll finish the sources by nine tonight."))
    }
}
