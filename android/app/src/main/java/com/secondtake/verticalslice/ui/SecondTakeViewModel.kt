package com.secondtake.verticalslice.ui

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import com.secondtake.verticalslice.data.ScenarioRepository
import com.secondtake.verticalslice.domain.ConversationForkEngine
import com.secondtake.verticalslice.domain.FlowStage
import com.secondtake.verticalslice.domain.FlowState
import com.secondtake.verticalslice.domain.LocaleContract
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.Scenario
import com.secondtake.verticalslice.domain.ScenarioScript
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SecondTakeUiState(
    val scenario: Scenario,
    val script: ScenarioScript,
    val localeContract: LocaleContract,
    val flow: FlowState,
)

class SecondTakeViewModel(private val savedStateHandle: SavedStateHandle) : ViewModel() {
    private val scenario = ScenarioRepository.validatedScenario()
    private var localeContract = LocaleContract(
        interfaceLanguage = safeLocale(savedStateHandle[KEY_INTERFACE_LOCALE]),
        conversationLanguage = safeLocale(savedStateHandle[KEY_CONVERSATION_LOCALE]),
    )
    private var engine = ConversationForkEngine(scenario, localeContract)

    private val initialStage = savedStateHandle.get<String>(KEY_STAGE)
        ?.let { runCatching { FlowStage.valueOf(it) }.getOrNull() }
        ?: FlowStage.SCENARIO_INTRO

    private val _uiState = MutableStateFlow(buildState(engine.restoreStage(initialStage)))
    val uiState: StateFlow<SecondTakeUiState> = _uiState.asStateFlow()

    fun startScenario() = publish(engine.startScenario())

    fun chooseFirstResponse() {
        engine.chooseFirstResponse()
        publish(engine.revealTurningPoint())
    }

    fun revealTurningPoint() {
        if (engine.state is FlowState.BranchAConsequence) publish(engine.revealTurningPoint())
    }

    fun beginRewind() = publish(engine.beginRewind())

    fun completeRewind() {
        if (engine.state is FlowState.Rewinding) publish(engine.completeRewind())
    }

    fun chooseAlternativeResponse() = publish(engine.chooseAlternativeResponse())

    fun compareBranches() = publish(engine.compareBranches())

    fun restart() {
        engine.reset()
        publish(engine.state)
    }

    fun setInterfaceLanguage(locale: LocaleTag) = replaceLocales(locale, localeContract.conversationLanguage)

    fun setConversationLanguage(locale: LocaleTag) = replaceLocales(localeContract.interfaceLanguage, locale)

    fun setDemoLocale(locale: LocaleTag) = replaceLocales(locale, locale)

    private fun replaceLocales(interfaceLanguage: LocaleTag, conversationLanguage: LocaleTag) {
        localeContract = LocaleContract(interfaceLanguage, conversationLanguage)
        savedStateHandle[KEY_INTERFACE_LOCALE] = interfaceLanguage.value
        savedStateHandle[KEY_CONVERSATION_LOCALE] = conversationLanguage.value
        engine = ConversationForkEngine(scenario, localeContract)
        publish(engine.state)
    }

    private fun publish(flow: FlowState) {
        savedStateHandle[KEY_STAGE] = flow.stage.name
        _uiState.value = buildState(flow)
    }

    private fun buildState(flow: FlowState) = SecondTakeUiState(
        scenario = scenario,
        script = scenario.scriptFor(localeContract.conversationLanguage),
        localeContract = localeContract,
        flow = flow,
    )

    private fun safeLocale(raw: String?): LocaleTag = when (raw) {
        ScenarioRepository.PortugueseBrazil.value -> ScenarioRepository.PortugueseBrazil
        else -> ScenarioRepository.English
    }

    companion object {
        private const val KEY_STAGE = "flow_stage"
        private const val KEY_INTERFACE_LOCALE = "interface_locale"
        private const val KEY_CONVERSATION_LOCALE = "conversation_locale"
    }
}
