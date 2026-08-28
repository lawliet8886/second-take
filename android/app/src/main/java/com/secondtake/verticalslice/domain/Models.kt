package com.secondtake.verticalslice.domain

@JvmInline
value class LocaleTag(val value: String) {
    init {
        require(value.matches(Regex("^[a-z]{2,3}-[A-Z]{2}$"))) { "Locale must be a BCP 47 language-region tag" }
    }
}

data class LocaleContract(
    val interfaceLanguage: LocaleTag,
    val conversationLanguage: LocaleTag,
)

enum class Speaker { ALEX, USER }

data class Persona(
    val id: String,
    val version: Int,
    val displayName: String,
    val role: String,
    val traits: List<String>,
)

data class ScenarioFact(val key: String, val value: String)

data class ConversationTurn(
    val id: String,
    val speaker: Speaker,
    val text: String,
    val logicalTimestamp: String,
)

data class UserChoice(
    val id: String,
    val text: String,
)

data class Consequence(
    val id: String,
    val immediateTurn: ConversationTurn,
    val summary: String,
    val causalExplanation: String,
)

data class ScenarioScript(
    val locale: LocaleTag,
    val title: String,
    val summary: String,
    val contextSummary: String,
    val logicalTimestamp: String,
    val preForkTurns: List<ConversationTurn>,
    val choiceA: UserChoice,
    val consequenceA: Consequence,
    val choiceB: UserChoice,
    val branchBTurns: List<ConversationTurn>,
    val consequenceBSummary: String,
    val consequenceBCausalExplanation: String,
)

data class Scenario(
    val id: String,
    val version: Int,
    val facts: List<ScenarioFact>,
    val persona: Persona,
    val scripts: Map<LocaleTag, ScenarioScript>,
) {
    fun scriptFor(locale: LocaleTag): ScenarioScript =
        requireNotNull(scripts[locale]) { "No deterministic script for ${locale.value}" }
}

enum class ConversationStatus { IN_PROGRESS }

data class ConversationState(
    val scenarioId: String,
    val scenarioVersion: Int,
    val facts: List<ScenarioFact>,
    val persona: Persona,
    val history: List<ConversationTurn>,
    val logicalTimestamp: String,
    val status: ConversationStatus,
    val localeContract: LocaleContract,
    val variables: Map<String, String>,
)

data class ForkPoint(
    val id: String,
    val afterTurnId: String,
    val historySize: Int,
)

data class ForkSnapshot(
    val id: String,
    val scenarioId: String,
    val scenarioVersion: Int,
    val facts: List<ScenarioFact>,
    val persona: Persona,
    val history: List<ConversationTurn>,
    val logicalTimestamp: String,
    val status: ConversationStatus,
    val localeContract: LocaleContract,
    val variables: Map<String, String>,
    val forkPoint: ForkPoint,
) {
    fun restore(): ConversationState = ConversationState(
        scenarioId = scenarioId,
        scenarioVersion = scenarioVersion,
        facts = facts.map { it.copy() },
        persona = persona.copy(traits = persona.traits.toList()),
        history = history.map { it.copy() },
        logicalTimestamp = logicalTimestamp,
        status = status,
        localeContract = localeContract.copy(),
        variables = variables.toMap(),
    )
}

enum class BranchId { A, B }

data class Branch(
    val id: BranchId,
    val snapshotId: String,
    val historyBeforeFork: List<ConversationTurn>,
    val userChoice: UserChoice,
    val turnsAfterFork: List<ConversationTurn>,
    val consequence: Consequence,
)

data class Comparison(
    val snapshot: ForkSnapshot,
    val branchA: Branch,
    val branchB: Branch,
) {
    init {
        require(branchA.historyBeforeFork == branchB.historyBeforeFork)
        require(branchA.historyBeforeFork == snapshot.history)
        require(branchA.snapshotId == snapshot.id && branchB.snapshotId == snapshot.id)
        require(branchA.userChoice != branchB.userChoice)
        require(branchA.consequence != branchB.consequence)
    }
}
