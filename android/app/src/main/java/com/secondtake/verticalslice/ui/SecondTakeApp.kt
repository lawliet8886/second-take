package com.secondtake.verticalslice.ui

import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.secondtake.verticalslice.R
import com.secondtake.verticalslice.data.ScenarioRepository
import com.secondtake.verticalslice.domain.Branch
import com.secondtake.verticalslice.domain.ConversationTurn
import com.secondtake.verticalslice.domain.FlowState
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.Speaker
import com.secondtake.verticalslice.localization.ProvideInterfaceLanguage
import com.secondtake.verticalslice.localization.textResource
import com.secondtake.verticalslice.ui.theme.Action
import com.secondtake.verticalslice.ui.theme.Canvas as CanvasColor
import com.secondtake.verticalslice.ui.theme.Checkpoint
import com.secondtake.verticalslice.ui.theme.Coral
import com.secondtake.verticalslice.ui.theme.Ink
import com.secondtake.verticalslice.ui.theme.Line
import com.secondtake.verticalslice.ui.theme.Mint
import com.secondtake.verticalslice.ui.theme.Muted
import com.secondtake.verticalslice.ui.theme.MutedDark
import com.secondtake.verticalslice.ui.theme.Surface as SurfaceColor
import com.secondtake.verticalslice.ui.theme.SurfaceRaised
import com.secondtake.verticalslice.ui.theme.Violet
import com.secondtake.verticalslice.ui.theme.VioletDeep
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun SecondTakeApp(viewModel: SecondTakeViewModel) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ProvideInterfaceLanguage(uiState.localeContract.interfaceLanguage) {
        var showExitConfirmation by rememberSaveable { mutableStateOf(false) }
        val leavePracticeTitle = textResource(R.string.leave_practice_title)
        val leavePracticeBody = textResource(R.string.leave_practice_body)
        val keepPractisingLabel = textResource(R.string.keep_practising)
        val leavePracticeLabel = textResource(R.string.leave_practice)
        val context = LocalContext.current
        val reducedMotion = remember(context) {
            Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
        }

        LaunchedEffect(uiState.flow.stage, reducedMotion) {
            when (uiState.flow) {
                is FlowState.BranchAConsequence -> {
                    delay(if (reducedMotion) 1 else 260)
                    viewModel.revealTurningPoint()
                }
                is FlowState.Rewinding -> {
                    delay(if (reducedMotion) 260 else 1_600)
                    viewModel.completeRewind()
                }
                else -> Unit
            }
        }

        BackHandler(enabled = uiState.flow !is FlowState.ScenarioIntro) {
            showExitConfirmation = true
        }

        if (showExitConfirmation) {
            AlertDialog(
                onDismissRequest = { showExitConfirmation = false },
                title = { Text(leavePracticeTitle) },
                text = { Text(leavePracticeBody) },
                confirmButton = {
                    TextButton(
                        modifier = Modifier.testTag("keep_practising"),
                        onClick = { showExitConfirmation = false },
                    ) { Text(keepPractisingLabel) }
                },
                dismissButton = {
                    TextButton(
                        modifier = Modifier.testTag("leave_practice"),
                        onClick = {
                            showExitConfirmation = false
                            viewModel.restart()
                        },
                    ) { Text(leavePracticeLabel) }
                },
            )
        }

        if (uiState.flow is FlowState.Rewinding) {
            RewindScreen(uiState.script.logicalTimestamp, reducedMotion)
        } else {
            Column(Modifier.fillMaxSize().background(CanvasColor).statusBarsPadding()) {
                BrandBar(
                    locale = uiState.localeContract.interfaceLanguage,
                    onLocale = viewModel::setDemoLocale,
                )
                when (val flow = uiState.flow) {
                    FlowState.ScenarioIntro -> ScenarioIntroScreen(uiState, viewModel::startScenario)
                    is FlowState.WaitingForFirstChoice -> ConversationScreen(uiState, flow.conversation.history, viewModel::chooseFirstResponse)
                    is FlowState.BranchAConsequence -> FirstTryScreen(uiState, flow.branchA, false, viewModel::beginRewind)
                    is FlowState.TurningPoint -> FirstTryScreen(uiState, flow.branchA, true, viewModel::beginRewind)
                    is FlowState.RestoredFork -> RestoredForkScreen(uiState, flow, viewModel::chooseAlternativeResponse)
                    is FlowState.BranchBConsequence -> BranchBScreen(uiState, flow, viewModel::compareBranches)
                    is FlowState.ComparisonReady -> ComparisonScreen(uiState, flow, viewModel::restart)
                    is FlowState.Rewinding -> Unit
                }
            }
        }
    }
}

@Composable
private fun BrandBar(locale: LocaleTag, onLocale: (LocaleTag) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 68.dp).padding(horizontal = 18.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Canvas(Modifier.size(28.dp)) {
                drawArc(Violet, 190f, 250f, false, Offset(2.dp.toPx(), 3.dp.toPx()), Size(17.dp.toPx(), 10.dp.toPx()), style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
                drawArc(Mint, 10f, 250f, false, Offset(9.dp.toPx(), 13.dp.toPx()), Size(17.dp.toPx(), 10.dp.toPx()), style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
            }
            Spacer(Modifier.width(8.dp))
            Text(textResource(R.string.app_name), color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
        Box {
            val activeName = if (locale == ScenarioRepository.PortugueseBrazil) textResource(R.string.language_pt) else textResource(R.string.language_en)
            val selectorDescription = textResource(R.string.language_selector, activeName)
            Surface(
                modifier = Modifier.heightIn(min = 48.dp).testTag("language_selector")
                    .clickable(role = Role.Button) { expanded = true }
                    .semantics { contentDescription = selectorDescription },
                shape = RoundedCornerShape(15.dp),
                color = SurfaceRaised,
                border = androidx.compose.foundation.BorderStroke(1.dp, Line),
            ) {
                Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("◎", color = Mint, fontSize = 19.sp)
                    Spacer(Modifier.width(7.dp))
                    Text(if (locale == ScenarioRepository.PortugueseBrazil) "PT-BR" else "EN", color = Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Spacer(Modifier.width(5.dp))
                    Text("⌄", color = Muted)
                }
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }, modifier = Modifier.background(SurfaceRaised)) {
                DropdownMenuItem(
                    text = { Text(textResource(R.string.language_pt)) },
                    onClick = { expanded = false; onLocale(ScenarioRepository.PortugueseBrazil) },
                    trailingIcon = { if (locale == ScenarioRepository.PortugueseBrazil) Text("✓", color = Mint) },
                )
                DropdownMenuItem(
                    text = { Text(textResource(R.string.language_en)) },
                    onClick = { expanded = false; onLocale(ScenarioRepository.English) },
                    trailingIcon = { if (locale == ScenarioRepository.English) Text("✓", color = Mint) },
                )
            }
        }
    }
}

@Composable
private fun ScrollScreen(tag: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().testTag(tag).verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 18.dp).padding(bottom = 34.dp),
        content = content,
    )
}

@Composable
private fun ScenarioIntroScreen(ui: SecondTakeUiState, onStart: () -> Unit) = ScrollScreen("scenario_screen") {
    Eyebrow(textResource(R.string.conversation_fork), Violet)
    Spacer(Modifier.height(16.dp))
    Text(textResource(R.string.hero_title), color = Ink, fontWeight = FontWeight.Black, fontSize = 43.sp, lineHeight = 42.sp)
    Spacer(Modifier.height(16.dp))
    Text(textResource(R.string.hero_lede), color = Muted, fontSize = 17.sp, lineHeight = 25.sp)
    Spacer(Modifier.height(28.dp))
    Surface(shape = RoundedCornerShape(24.dp), color = SurfaceRaised, border = androidx.compose.foundation.BorderStroke(1.dp, Line)) {
        Column(Modifier.padding(18.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(textResource(R.string.audience), Checkpoint)
                Pill(textResource(R.string.duration), Mint)
            }
            Spacer(Modifier.height(16.dp))
            Text(ui.script.title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 25.sp)
            Spacer(Modifier.height(9.dp))
            Text(ui.script.summary, color = Muted, fontSize = 15.sp, lineHeight = 22.sp)
        }
    }
    Spacer(Modifier.height(18.dp))
    PrimaryButton(textResource(R.string.start_conversation), "start_conversation", onStart)
    Spacer(Modifier.height(10.dp))
    Text(textResource(R.string.privacy_note), color = MutedDark, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun ConversationScreen(ui: SecondTakeUiState, history: List<ConversationTurn>, onChoice: () -> Unit) = ScrollScreen("conversation_screen") {
    ScreenHeading(textResource(R.string.conversation_fork), textResource(R.string.check_in), history.first().logicalTimestamp)
    Spacer(Modifier.height(18.dp))
    history.forEach { MessageBubble(it) ; Spacer(Modifier.height(12.dp)) }
    ChoiceAction(textResource(R.string.your_turn), textResource(R.string.how_respond), textResource(R.string.tap_to_say), ui.script.choiceA.text, "first_choice", onChoice)
}

@Composable
private fun FirstTryScreen(ui: SecondTakeUiState, branch: Branch, showTurningPoint: Boolean, onRewind: () -> Unit) = ScrollScreen("first_try_screen") {
    ScreenHeading(textResource(R.string.first_try), textResource(R.string.choice_opened_path), ui.script.logicalTimestamp)
    PreservedContext(textResource(R.string.before_choice), ui.script.preForkTurns.last().text)
    Spacer(Modifier.height(14.dp))
    Eyebrow(textResource(R.string.your_choice), Violet)
    Spacer(Modifier.height(7.dp))
    MessageBubble(branch.turnsAfterFork.first())
    CausalConnector()
    Eyebrow(textResource(R.string.what_happened_next), Coral)
    Spacer(Modifier.height(7.dp))
    MessageBubble(branch.consequence.immediateTurn, consequence = true)
    if (showTurningPoint) {
        Spacer(Modifier.height(18.dp))
        Surface(
            modifier = Modifier.fillMaxWidth().testTag("turning_point"),
            color = Color(0xFF321F29),
            border = androidx.compose.foundation.BorderStroke(1.dp, Coral.copy(alpha = .55f)),
            shape = RoundedCornerShape(23.dp),
        ) {
            Column(Modifier.padding(18.dp)) {
                Eyebrow(textResource(R.string.turning_point), Coral)
                Spacer(Modifier.height(7.dp))
                Text(textResource(R.string.changed_direction), color = Ink, fontWeight = FontWeight.Bold, fontSize = 19.sp)
                Spacer(Modifier.height(7.dp))
                Text(textResource(R.string.turning_explanation), color = Muted, fontSize = 14.sp, lineHeight = 21.sp)
                Spacer(Modifier.height(14.dp))
                PrimaryButton("↶  ${textResource(R.string.rewind_action)}", "rewind_button", onRewind, Coral)
            }
        }
    }
}

@Composable
private fun RewindScreen(time: String, reducedMotion: Boolean) {
    val context = LocalContext.current
    val description = textResource(R.string.rewind_description)
    Column(
        modifier = Modifier.fillMaxSize().testTag("rewind_screen").background(CanvasColor).statusBarsPadding(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Eyebrow(textResource(R.string.rewinding), Violet)
        Spacer(Modifier.height(22.dp))
        RewindGraphic(reducedMotion, description)
        Spacer(Modifier.height(24.dp))
        Text(textResource(R.string.returning_to, time), color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(if (time.contains(":")) previousTime(time, 2) else time, color = MutedDark.copy(alpha = .3f), fontSize = 12.sp)
            Text(previousTime(time, 1), color = MutedDark.copy(alpha = .45f), fontSize = 12.sp)
            Text(time, color = Mint, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun RewindGraphic(reducedMotion: Boolean, description: String) {
    val transition = rememberInfiniteTransition(label = "rewind")
    val movingAngle by transition.animateFloat(
        initialValue = 0f,
        targetValue = -360f,
        animationSpec = infiniteRepeatable(tween(1_250, easing = LinearEasing), RepeatMode.Restart),
        label = "rewind-arrow",
    )
    val angle = if (reducedMotion) -45f else movingAngle
    Canvas(Modifier.requiredSize(118.dp).semantics { contentDescription = description }) {
        val stroke = 3.dp.toPx()
        val radius = size.minDimension * .34f
        drawCircle(Line, radius, style = Stroke(stroke))
        drawArc(Checkpoint, 205f, 150f, false, topLeft = Offset(center.x - radius, center.y - radius), size = Size(radius * 2, radius * 2), style = Stroke(stroke, cap = StrokeCap.Round))
        rotate(angle, center) {
            val arrowCenter = Offset(center.x, center.y - radius)
            drawCircle(SurfaceRaised, 13.dp.toPx(), arrowCenter)
            drawCircle(Checkpoint.copy(alpha = .65f), 13.dp.toPx(), arrowCenter, style = Stroke(1.dp.toPx()))
            val p = Path().apply {
                moveTo(arrowCenter.x - 5.dp.toPx(), arrowCenter.y + 4.dp.toPx())
                lineTo(arrowCenter.x + 5.dp.toPx(), arrowCenter.y + 4.dp.toPx())
                lineTo(arrowCenter.x, arrowCenter.y - 5.dp.toPx())
                close()
            }
            drawPath(p, Checkpoint)
        }
    }
}

@Composable
private fun RestoredForkScreen(ui: SecondTakeUiState, flow: FlowState.RestoredFork, onChoice: () -> Unit) = ScrollScreen("restored_fork_screen") {
    ScreenHeading(textResource(R.string.second_try), textResource(R.string.moment_frozen), null)
    Surface(
        modifier = Modifier.fillMaxWidth().testTag("checkpoint"),
        color = SurfaceColor,
        border = androidx.compose.foundation.BorderStroke(1.dp, Checkpoint.copy(alpha = .7f)),
        shape = RoundedCornerShape(22.dp),
    ) {
        Column(Modifier.border(1.dp, Checkpoint.copy(alpha = .18f), RoundedCornerShape(17.dp)).padding(16.dp)) {
            Eyebrow("↶ ${textResource(R.string.back_here, ui.script.logicalTimestamp)}", Checkpoint)
            Spacer(Modifier.height(9.dp))
            Text(ui.script.contextSummary, color = MutedDark, fontSize = 12.sp)
            Spacer(Modifier.height(13.dp))
            Surface(color = Checkpoint.copy(alpha = .08f), shape = RoundedCornerShape(0.dp, 15.dp, 15.dp, 0.dp), modifier = Modifier.border(0.dp, Color.Transparent)) {
                Column(Modifier.border(width = 3.dp, color = Checkpoint, shape = RoundedCornerShape(0.dp)).padding(13.dp)) {
                    Text(textResource(R.string.alex_had_said).uppercase(), color = Checkpoint, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
                    Spacer(Modifier.height(6.dp))
                    Text("“${flow.snapshot.history.last().text}”", color = Ink, fontSize = 15.sp, lineHeight = 21.sp)
                }
            }
            Spacer(Modifier.height(11.dp))
            Text("▣  ${textResource(R.string.context_preserved)}", color = Muted, fontSize = 12.sp)
        }
    }
    Spacer(Modifier.height(14.dp))
    Text("✦  ${textResource(R.string.only_response_changes)}", color = Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    Spacer(Modifier.height(14.dp))
    ChoiceAction(textResource(R.string.your_turn), textResource(R.string.choose_new_response), textResource(R.string.new_response), ui.script.choiceB.text, "alternative_choice", onChoice)
}

@Composable
private fun BranchBScreen(ui: SecondTakeUiState, flow: FlowState.BranchBConsequence, onCompare: () -> Unit) = ScrollScreen("new_path_screen") {
    ScreenHeading(textResource(R.string.second_try), textResource(R.string.same_moment_new_path), ui.script.logicalTimestamp)
    Text("↶ ${textResource(R.string.from_restored_moment, ui.script.logicalTimestamp)}", color = Checkpoint, fontSize = 12.sp)
    Spacer(Modifier.height(14.dp))
    Surface(color = Action.copy(alpha = .08f), border = androidx.compose.foundation.BorderStroke(1.dp, Action.copy(alpha = .55f)), shape = RoundedCornerShape(21.dp)) {
        Column(Modifier.padding(14.dp)) {
            Eyebrow(textResource(R.string.new_response), Action)
            Spacer(Modifier.height(8.dp))
            MessageBubble(flow.branchB.turnsAfterFork.first())
        }
    }
    Spacer(Modifier.height(18.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(Modifier.weight(1f), color = Checkpoint.copy(alpha = .6f))
        Text(textResource(R.string.new_path).uppercase(), color = Checkpoint, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.5.sp, modifier = Modifier.padding(horizontal = 10.dp).testTag("new_path_divider"))
        HorizontalDivider(Modifier.weight(1f), color = Checkpoint.copy(alpha = .6f))
    }
    Spacer(Modifier.height(14.dp))
    flow.branchB.turnsAfterFork.drop(1).forEach { MessageBubble(it); Spacer(Modifier.height(12.dp)) }
    PrimaryButton(textResource(R.string.compare_versions), "compare_button", onCompare)
}

@Composable
private fun ComparisonScreen(ui: SecondTakeUiState, flow: FlowState.ComparisonReady, onRestart: () -> Unit) = ScrollScreen("comparison_screen") {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Eyebrow(textResource(R.string.fork_complete), Violet)
        Spacer(Modifier.height(12.dp))
        Text(textResource(R.string.two_trajectories), color = Ink, fontWeight = FontWeight.Black, fontSize = 30.sp, lineHeight = 32.sp, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(textResource(R.string.everything_same, ui.script.logicalTimestamp), color = Muted, fontSize = 14.sp, textAlign = TextAlign.Center)
        Spacer(Modifier.height(13.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Pill(textResource(R.string.facts), Mint); Pill(textResource(R.string.personality), Mint); Pill(textResource(R.string.history), Mint)
        }
    }
    Spacer(Modifier.height(20.dp))
    VersionCard(textResource(R.string.version_a), flow.comparison.branchA.userChoice.text, flow.comparison.branchA.consequence.summary, Coral)
    Spacer(Modifier.height(11.dp))
    VersionCard(textResource(R.string.version_b), flow.comparison.branchB.userChoice.text, flow.comparison.branchB.consequence.summary, Mint)
    Spacer(Modifier.height(12.dp))
    Surface(color = SurfaceRaised, border = androidx.compose.foundation.BorderStroke(1.dp, Line), shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(textResource(R.string.what_changed), color = Violet, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(Modifier.height(12.dp))
            CausalRow("A", flow.comparison.branchA.consequence.causalExplanation, Coral)
            Spacer(Modifier.height(9.dp))
            CausalRow("B", flow.comparison.branchB.consequence.causalExplanation, Mint)
        }
    }
    Spacer(Modifier.height(15.dp))
    PrimaryButton(textResource(R.string.restart), "restart_button", onRestart)
}

@Composable
private fun VersionCard(label: String, choice: String, consequence: String, accent: Color) {
    Surface(color = SurfaceColor, border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = .65f)), shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(15.dp)) {
            Eyebrow(label, accent)
            Spacer(Modifier.height(11.dp))
            Text("“$choice”", color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 22.sp)
            Spacer(Modifier.height(12.dp)); HorizontalDivider(color = Line); Spacer(Modifier.height(10.dp))
            Text(textResource(R.string.immediate_consequence).uppercase(), color = MutedDark, fontSize = 10.sp, letterSpacing = 1.sp)
            Spacer(Modifier.height(5.dp))
            Text(consequence, color = Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
    }
}

@Composable
private fun CausalRow(label: String, text: String, accent: Color) {
    Row(verticalAlignment = Alignment.Top) {
        Box(Modifier.size(23.dp).clip(CircleShape).background(accent.copy(alpha = .17f)), contentAlignment = Alignment.Center) {
            Text(label, color = accent, fontWeight = FontWeight.Bold, fontSize = 11.sp)
        }
        Spacer(Modifier.width(9.dp))
        Text(text, color = Muted, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun ScreenHeading(eyebrow: String, title: String, time: String?) {
    Eyebrow(eyebrow, Violet)
    Spacer(Modifier.height(10.dp))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(title, color = Ink, fontWeight = FontWeight.Black, fontSize = 30.sp, lineHeight = 32.sp, modifier = Modifier.weight(1f))
        if (time != null) Text(time, color = MutedDark, fontSize = 12.sp, modifier = Modifier.padding(start = 10.dp, bottom = 3.dp))
    }
}

@Composable
private fun Eyebrow(text: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.width(18.dp).height(1.dp).background(color))
        Spacer(Modifier.width(8.dp))
        Text(text.uppercase(), color = color, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, letterSpacing = 1.3.sp)
    }
}

@Composable
private fun Pill(text: String, dot: Color) {
    Surface(color = Color.White.copy(alpha = .06f), shape = CircleShape) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(5.dp).clip(CircleShape).background(dot)); Spacer(Modifier.width(6.dp))
            Text(text, color = Muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MessageBubble(turn: ConversationTurn, consequence: Boolean = false) {
    val user = turn.speaker == Speaker.USER
    Row(
        modifier = Modifier.fillMaxWidth().testTag("turn_${turn.id}"),
        horizontalArrangement = if (user) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Top,
    ) {
        if (!user) { RoleAvatar(false); Spacer(Modifier.width(9.dp)) }
        Surface(
            modifier = Modifier.fillMaxWidth(.84f),
            color = when { consequence -> Color(0xFF291B25); user -> VioletDeep; else -> SurfaceColor },
            border = androidx.compose.foundation.BorderStroke(1.dp, when { consequence -> Coral.copy(alpha = .55f); user -> Violet.copy(alpha = .6f); else -> Line }),
            shape = if (user) RoundedCornerShape(19.dp, 7.dp, 19.dp, 19.dp) else RoundedCornerShape(7.dp, 19.dp, 19.dp, 19.dp),
        ) {
            Column(Modifier.padding(13.dp)) {
                Text(if (user) textResource(R.string.user_role).uppercase() else textResource(R.string.alex_role).uppercase(), color = if (user) Violet else Mint, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = .8.sp)
                Spacer(Modifier.height(5.dp))
                Text(turn.text, color = Ink, fontSize = 15.sp, lineHeight = 21.sp, textAlign = if (user) TextAlign.End else TextAlign.Start)
            }
        }
        if (user) { Spacer(Modifier.width(9.dp)); RoleAvatar(true) }
    }
}

@Composable
private fun RoleAvatar(user: Boolean) {
    val shape = if (user) RoundedCornerShape(9.dp) else CircleShape
    val roleDescription = if (user) textResource(R.string.user_role) else textResource(R.string.alex_role)
    Box(
        modifier = Modifier.size(36.dp).clip(shape).background(if (user) Violet else Mint)
            .semantics { contentDescription = roleDescription },
        contentAlignment = Alignment.Center,
    ) {
        Text(if (user) textResource(R.string.user_avatar) else "A", color = CanvasColor, fontWeight = FontWeight.Black, fontSize = 10.sp)
    }
}

@Composable
private fun ChoiceAction(label: String, question: String, action: String, choice: String, tag: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFF2B241A),
        border = androidx.compose.foundation.BorderStroke(1.dp, Action.copy(alpha = .65f)),
        shape = RoundedCornerShape(23.dp),
    ) {
        Column(Modifier.padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Action), contentAlignment = Alignment.Center) { Text("✦", color = CanvasColor) }
                Spacer(Modifier.width(10.dp))
                Column { Text(label.uppercase(), color = Action, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, letterSpacing = 1.2.sp); Text(question, color = Ink, fontWeight = FontWeight.Bold, fontSize = 17.sp) }
            }
            Spacer(Modifier.height(13.dp))
            Surface(
                modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).testTag(tag).clickable(role = Role.Button, onClick = onClick).semantics { role = Role.Button },
                color = Color(0xFF10151B),
                border = androidx.compose.foundation.BorderStroke(1.dp, Action.copy(alpha = .7f)),
                shape = RoundedCornerShape(17.dp),
            ) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(action.uppercase(), color = Action, fontWeight = FontWeight.ExtraBold, fontSize = 10.sp, letterSpacing = 1.sp)
                        Spacer(Modifier.height(5.dp)); Text(choice, color = Ink, fontSize = 15.sp, lineHeight = 21.sp)
                    }
                    Spacer(Modifier.width(8.dp)); Text("→", color = Action, fontSize = 21.sp)
                }
            }
        }
    }
}

@Composable
private fun PrimaryButton(label: String, tag: String, onClick: () -> Unit, start: Color = Violet) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).testTag(tag),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(containerColor = start, contentColor = CanvasColor),
    ) { Text(label, fontWeight = FontWeight.Bold, fontSize = 15.sp) }
}

@Composable
private fun PreservedContext(label: String, text: String) {
    Column(Modifier.fillMaxWidth().background(Color.White.copy(alpha = .025f), RoundedCornerShape(0.dp, 12.dp, 12.dp, 0.dp)).border(2.dp, MutedDark.copy(alpha = .5f), RoundedCornerShape(0.dp)).padding(11.dp)) {
        Text(label.uppercase(), color = MutedDark, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = 1.sp)
        Spacer(Modifier.height(4.dp)); Text(textResource(R.string.alex_quote, text), color = MutedDark, fontSize = 12.sp)
    }
}

@Composable
private fun CausalConnector() {
    Column(Modifier.fillMaxWidth().height(48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.width(2.dp).height(28.dp).background(Violet))
        Text("↓", color = Coral, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    }
}

private fun previousTime(time: String, minutes: Int): String {
    val pieces = time.removeSuffix(" PM").split(":")
    val minute = pieces.getOrNull(1)?.toIntOrNull() ?: return time
    return "${pieces[0]}:${(minute + minutes).toString().padStart(2, '0')}${if (time.endsWith(" PM")) " PM" else ""}"
}
