package com.secondtake.verticalslice.domain

import com.secondtake.verticalslice.data.ScenarioRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ConversationForkEngineTest {
    private fun engine(interfaceTag: LocaleTag = ScenarioRepository.English, conversationTag: LocaleTag = ScenarioRepository.English) =
        ConversationForkEngine(
            scenario = ScenarioRepository.validatedScenario(),
            localeContract = LocaleContract(interfaceTag, conversationTag),
        )

    @Test
    fun snapshot_is_created_with_the_complete_preserved_universe() {
        val engine = engine()
        val waiting = engine.startScenario()
        val snapshot = waiting.snapshot

        assertEquals(engine.scenario.id, snapshot.scenarioId)
        assertEquals(engine.scenario.version, snapshot.scenarioVersion)
        assertEquals(engine.scenario.facts, snapshot.facts)
        assertEquals(engine.scenario.persona, snapshot.persona)
        assertEquals(3, snapshot.history.size)
        assertEquals(snapshot.history.last().id, snapshot.forkPoint.afterTurnId)
        assertEquals(snapshot.history.size, snapshot.forkPoint.historySize)
        assertEquals("two-slides-incomplete", snapshot.variables["presentationStatus"])
    }

    @Test
    fun rewind_restores_exactly_the_frozen_snapshot() {
        val engine = engine()
        val original = engine.startScenario().snapshot
        engine.chooseFirstResponse()
        engine.revealTurningPoint()
        engine.beginRewind()
        val restored = engine.completeRewind().restoredConversation

        assertEquals(original.restore(), restored)
    }

    @Test
    fun branches_are_identical_before_the_fork() {
        val comparison = completedComparison(engine())

        assertEquals(comparison.branchA.historyBeforeFork, comparison.branchB.historyBeforeFork)
        assertEquals(comparison.snapshot.history, comparison.branchA.historyBeforeFork)
    }

    @Test
    fun only_the_user_choice_changes_at_the_bifurcation() {
        val comparison = completedComparison(engine())

        assertEquals(comparison.branchA.snapshotId, comparison.branchB.snapshotId)
        assertNotEquals(comparison.branchA.userChoice, comparison.branchB.userChoice)
        assertNotEquals(comparison.branchA.consequence, comparison.branchB.consequence)
        assertEquals(Speaker.USER, comparison.branchA.turnsAfterFork.first().speaker)
        assertEquals(Speaker.USER, comparison.branchB.turnsAfterFork.first().speaker)
    }

    @Test
    fun scenario_facts_never_change_between_snapshot_and_branches() {
        val comparison = completedComparison(engine())

        assertEquals(ScenarioRepository.validatedScenario().facts, comparison.snapshot.facts)
        assertEquals(comparison.snapshot.history, comparison.branchA.historyBeforeFork)
        assertEquals(comparison.snapshot.history, comparison.branchB.historyBeforeFork)
    }

    @Test
    fun alex_persona_never_changes() {
        val comparison = completedComparison(engine())

        assertEquals(ScenarioRepository.validatedScenario().persona, comparison.snapshot.persona)
        assertTrue(comparison.snapshot.persona.traits.contains("not-caricatural"))
    }

    @Test
    fun fork_never_changes_interface_or_conversation_locale() {
        val contract = LocaleContract(ScenarioRepository.PortugueseBrazil, ScenarioRepository.English)
        val comparison = completedComparison(engine(contract.interfaceLanguage, contract.conversationLanguage))

        assertEquals(contract, comparison.snapshot.localeContract)
        assertEquals("en-US", comparison.snapshot.localeContract.conversationLanguage.value)
        assertEquals("pt-BR", comparison.snapshot.localeContract.interfaceLanguage.value)
    }

    @Test
    fun a_rewind_b_process_can_be_repeated_without_corruption() {
        val engine = engine()
        val first = completedComparison(engine)
        engine.reset()
        val second = completedComparison(engine)

        assertEquals(first, second)
        assertEquals(first.snapshot.history, second.snapshot.history)
    }

    @Test(expected = IllegalStateException::class)
    fun invalid_transition_is_rejected_instead_of_creating_boolean_drift() {
        engine().beginRewind()
    }

    private fun completedComparison(engine: ConversationForkEngine): Comparison {
        engine.startScenario()
        engine.chooseFirstResponse()
        engine.revealTurningPoint()
        engine.beginRewind()
        engine.completeRewind()
        engine.chooseAlternativeResponse()
        return engine.compareBranches().comparison
    }
}
