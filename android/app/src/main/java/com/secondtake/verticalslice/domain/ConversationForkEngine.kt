package com.secondtake.verticalslice.domain

enum class FlowStage {
    SCENARIO_INTRO,
    WAITING_FOR_FIRST_CHOICE,
    BRANCH_A_CONSEQUENCE,
    TURNING_POINT,
    REWINDING,
    RESTORED_FORK,
    BRANCH_B_CONSEQUENCE,
    COMPARISON,
}

sealed interface FlowState {
    val stage: FlowStage

    data object ScenarioIntro : FlowState { override val stage = FlowStage.SCENARIO_INTRO }

    data class WaitingForFirstChoice(
        val snapshot: ForkSnapshot,
        val conversation: ConversationState,
    ) : FlowState { override val stage = FlowStage.WAITING_FOR_FIRST_CHOICE }

    data class BranchAConsequence(
        val snapshot: ForkSnapshot,
        val branchA: Branch,
    ) : FlowState { override val stage = FlowStage.BRANCH_A_CONSEQUENCE }

    data class TurningPoint(
        val snapshot: ForkSnapshot,
        val branchA: Branch,
    ) : FlowState { override val stage = FlowStage.TURNING_POINT }

    data class Rewinding(
        val snapshot: ForkSnapshot,
        val branchA: Branch,
    ) : FlowState { override val stage = FlowStage.REWINDING }

    data class RestoredFork(
        val snapshot: ForkSnapshot,
        val branchA: Branch,
        val restoredConversation: ConversationState,
    ) : FlowState { override val stage = FlowStage.RESTORED_FORK }

    data class BranchBConsequence(
        val snapshot: ForkSnapshot,
        val branchA: Branch,
        val branchB: Branch,
    ) : FlowState { override val stage = FlowStage.BRANCH_B_CONSEQUENCE }

    data class ComparisonReady(
        val comparison: Comparison,
    ) : FlowState { override val stage = FlowStage.COMPARISON }
}

class ConversationForkEngine(
    val scenario: Scenario,
    val localeContract: LocaleContract,
) {
    private val script = scenario.scriptFor(localeContract.conversationLanguage)
    private var snapshot: ForkSnapshot? = null
    private var branchA: Branch? = null
    private var branchB: Branch? = null

    var state: FlowState = FlowState.ScenarioIntro
        private set

    fun startScenario(): FlowState.WaitingForFirstChoice {
        require(state is FlowState.ScenarioIntro)
        val conversation = ConversationState(
            scenarioId = scenario.id,
            scenarioVersion = scenario.version,
            facts = scenario.facts.map { it.copy() },
            persona = scenario.persona.copy(traits = scenario.persona.traits.toList()),
            history = script.preForkTurns.map { it.copy() },
            logicalTimestamp = script.logicalTimestamp,
            status = ConversationStatus.IN_PROGRESS,
            localeContract = localeContract.copy(),
            variables = mapOf("presentationStatus" to "two-slides-incomplete"),
        )
        val forkPoint = ForkPoint(
            id = "${scenario.id}-v${scenario.version}-fork-1",
            afterTurnId = conversation.history.last().id,
            historySize = conversation.history.size,
        )
        val frozen = ForkSnapshot(
            id = "${forkPoint.id}-${localeContract.conversationLanguage.value}",
            scenarioId = conversation.scenarioId,
            scenarioVersion = conversation.scenarioVersion,
            facts = conversation.facts.map { it.copy() },
            persona = conversation.persona.copy(traits = conversation.persona.traits.toList()),
            history = conversation.history.map { it.copy() },
            logicalTimestamp = conversation.logicalTimestamp,
            status = conversation.status,
            localeContract = conversation.localeContract.copy(),
            variables = conversation.variables.toMap(),
            forkPoint = forkPoint,
        )
        snapshot = frozen
        return FlowState.WaitingForFirstChoice(frozen, conversation).also { state = it }
    }

    fun chooseFirstResponse(): FlowState.BranchAConsequence {
        val current = state as? FlowState.WaitingForFirstChoice
            ?: error("First choice is only valid at the preserved fork")
        val choiceTurn = ConversationTurn(
            id = "a-user-choice",
            speaker = Speaker.USER,
            text = script.choiceA.text,
            logicalTimestamp = script.logicalTimestamp,
        )
        val branch = Branch(
            id = BranchId.A,
            snapshotId = current.snapshot.id,
            historyBeforeFork = current.snapshot.history.map { it.copy() },
            userChoice = script.choiceA.copy(),
            turnsAfterFork = listOf(choiceTurn, script.consequenceA.immediateTurn.copy()),
            consequence = script.consequenceA.copy(immediateTurn = script.consequenceA.immediateTurn.copy()),
        )
        branchA = branch
        return FlowState.BranchAConsequence(current.snapshot, branch).also { state = it }
    }

    fun revealTurningPoint(): FlowState.TurningPoint {
        val current = state as? FlowState.BranchAConsequence
            ?: error("Turning Point requires Branch A consequence")
        return FlowState.TurningPoint(current.snapshot, current.branchA).also { state = it }
    }

    fun beginRewind(): FlowState.Rewinding {
        val current = state as? FlowState.TurningPoint
            ?: error("Rewind requires the Turning Point")
        return FlowState.Rewinding(current.snapshot, current.branchA).also { state = it }
    }

    fun completeRewind(): FlowState.RestoredFork {
        val current = state as? FlowState.Rewinding
            ?: error("Rewind completion requires Rewinding state")
        val restored = current.snapshot.restore()
        check(restored.history == current.snapshot.history)
        check(restored.facts == current.snapshot.facts)
        check(restored.persona == current.snapshot.persona)
        check(restored.localeContract == current.snapshot.localeContract)
        return FlowState.RestoredFork(current.snapshot, current.branchA, restored).also { state = it }
    }

    fun chooseAlternativeResponse(): FlowState.BranchBConsequence {
        val current = state as? FlowState.RestoredFork
            ?: error("Alternative response requires the restored snapshot")
        check(current.restoredConversation == current.snapshot.restore())
        val choiceTurn = ConversationTurn(
            id = "b-user-choice",
            speaker = Speaker.USER,
            text = script.choiceB.text,
            logicalTimestamp = script.logicalTimestamp,
        )
        val firstAlexTurn = script.branchBTurns.first()
        val branch = Branch(
            id = BranchId.B,
            snapshotId = current.snapshot.id,
            historyBeforeFork = current.snapshot.history.map { it.copy() },
            userChoice = script.choiceB.copy(),
            turnsAfterFork = listOf(choiceTurn) + script.branchBTurns.map { it.copy() },
            consequence = Consequence(
                id = "consequence-b",
                immediateTurn = firstAlexTurn.copy(),
                summary = script.consequenceBSummary,
                causalExplanation = script.consequenceBCausalExplanation,
            ),
        )
        branchB = branch
        return FlowState.BranchBConsequence(current.snapshot, current.branchA, branch).also { state = it }
    }

    fun compareBranches(): FlowState.ComparisonReady {
        val current = state as? FlowState.BranchBConsequence
            ?: error("Comparison requires both branches")
        val comparison = Comparison(current.snapshot, current.branchA, current.branchB)
        return FlowState.ComparisonReady(comparison).also { state = it }
    }

    fun currentSnapshot(): ForkSnapshot = requireNotNull(snapshot)

    fun reset() {
        snapshot = null
        branchA = null
        branchB = null
        state = FlowState.ScenarioIntro
    }

    fun restoreStage(stage: FlowStage): FlowState {
        reset()
        if (stage == FlowStage.SCENARIO_INTRO) return state
        startScenario()
        if (stage == FlowStage.WAITING_FOR_FIRST_CHOICE) return state
        chooseFirstResponse()
        if (stage == FlowStage.BRANCH_A_CONSEQUENCE) return state
        revealTurningPoint()
        if (stage == FlowStage.TURNING_POINT) return state
        beginRewind()
        if (stage == FlowStage.REWINDING) return state
        completeRewind()
        if (stage == FlowStage.RESTORED_FORK) return state
        chooseAlternativeResponse()
        if (stage == FlowStage.BRANCH_B_CONSEQUENCE) return state
        return compareBranches()
    }
}
