package com.secondtake.verticalslice

import android.graphics.Bitmap
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.platform.app.InstrumentationRegistry
import com.secondtake.verticalslice.domain.BackendOutcome
import com.secondtake.verticalslice.domain.ConversationClientError
import com.secondtake.verticalslice.domain.ConversationRepository
import com.secondtake.verticalslice.domain.IntentOption
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.MessageRole
import com.secondtake.verticalslice.domain.PublicConversation
import com.secondtake.verticalslice.domain.SelectionSource
import com.secondtake.verticalslice.domain.VisibleMessage
import com.secondtake.verticalslice.billing.AccessState
import com.secondtake.verticalslice.billing.PurchaseResult
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File
import java.io.FileOutputStream
import kotlinx.coroutines.CompletableDeferred

class ConversationForkFlowTest {
    private val fake = InstrumentedFakeRepository()
    private val entitlements = InstrumentedEntitlementRepository()
    init { SecondTakeAppGraph.repositoryOverride = fake; SecondTakeAppGraph.entitlementRepositoryOverride = entitlements }
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Before fun reset() = fake.reset()
    @After fun cleanUp() { SecondTakeAppGraph.repositoryOverride = null; SecondTakeAppGraph.entitlementRepositoryOverride = null }

    @Test fun connected_flow_handles_intent_lock_rewind_and_comparison() {
        composeRule.onNodeWithTag("language_selector").performClick()
        composeRule.onNodeWithText("Português (Brasil)").performClick()
        capture("01-cenario-inicial")
        composeRule.onNodeWithTag("start_conversation").performScrollTo().performClick()
        awaitInput()
        capture("02-conversa-normal")
        composeRule.onNodeWithTag("free_text_input").performTextInput("Estou preocupado com o projeto")
        capture("03-free-text-input")
        val turnGate=CompletableDeferred<Unit>();fake.nextTurnGate=turnGate
        composeRule.onNodeWithTag("send_turn").performClick()
        composeRule.waitUntil(1_000){composeRule.onAllNodesWithTag("alex_typing").fetchSemanticsNodes().isNotEmpty()}
        capture("04-user-message-pending",waitForIdle=false)
        turnGate.complete(Unit)
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("turning_point").fetchSemanticsNodes().isNotEmpty()}
        composeRule.onAllNodesWithTag("turn_t1")[0].performScrollTo()
        capture("05-alex-reply")
        capture("08-primeira-tentativa")
        composeRule.onNodeWithTag("turning_point").performScrollTo()
        capture("09-turning-point")
        composeRule.onNodeWithTag("rewind_button").performScrollTo().performClick()
        composeRule.onNodeWithTag("rewind_screen").assertIsDisplayed()
        capture("10-rewind")
        composeRule.waitUntil(4_000) { composeRule.onAllNodesWithTag("checkpoint").fetchSemanticsNodes().isNotEmpty() }
        capture("11-checkpoint-restaurado")
        send("Você consegue terminar hoje?")
        composeRule.waitUntil(3_000) { composeRule.onAllNodesWithTag("intent_lock").fetchSemanticsNodes().isNotEmpty() }
        composeRule.onNodeWithTag("intent_lock").performScrollTo().assertIsDisplayed()
        capture("06-intent-lock")
        val intentGate=CompletableDeferred<Unit>();fake.confirmGate=intentGate
        composeRule.onNodeWithTag("intent_REQUEST_COMPLETION").performClick()
        composeRule.waitUntil(1_000){composeRule.onAllNodesWithTag("alex_typing").fetchSemanticsNodes().isNotEmpty()}
        capture("07-intent-lock-escolhido",waitForIdle=false)
        intentGate.complete(Unit)
        composeRule.waitUntil(3_000) { composeRule.onAllNodesWithTag("compare_button").fetchSemanticsNodes().isNotEmpty() }
        composeRule.onAllNodesWithTag("turn_t2")[0].performScrollTo()
        capture("12-segunda-tentativa")
        composeRule.onNodeWithTag("compare_button").performScrollTo()
        capture("13-novo-caminho")
        composeRule.onNodeWithTag("compare_button").performScrollTo().performClick()
        composeRule.onNodeWithTag("comparison_screen").assertIsDisplayed()
        capture("14-comparacao-ab")
        assertEquals("REQUEST_COMPLETION", fake.confirmedIntent)
    }

    @Test fun out_of_scope_is_a_compact_second_take_intervention() {
        composeRule.onNodeWithTag("start_conversation").performScrollTo().performClick();awaitInput()
        send("Qual é a capital da França?")
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("recovery_card").fetchSemanticsNodes().isNotEmpty()}
        capture("15-out-of-scope")
    }

    @Test fun activity_recreation_rehydrates_backend_truth_without_duplicate_turn() {
        composeRule.onNodeWithTag("start_conversation").performScrollTo().performClick();awaitInput();send("Primeira fala")
        val messages = fake.session.messages.size
        composeRule.activityRule.scenario.recreate()
        composeRule.waitUntil(3_000) { composeRule.onAllNodesWithTag("conversation_screen").fetchSemanticsNodes().isNotEmpty() }
        composeRule.onNodeWithTag("turning_point").performScrollTo().assertIsDisplayed()
        assertEquals(messages, fake.session.messages.size)
    }

    @Test fun connection_failure_preserves_client_id_for_retry() {
        composeRule.onNodeWithTag("start_conversation").performScrollTo().performClick();awaitInput();fake.failNext = true;send("Não duplica")
        capture("16-transport-recovery")
        composeRule.onNodeWithTag("retry_network").performScrollTo().performClick()
        composeRule.waitUntil(3_000) { fake.clientIds.size == 2 }
        assertEquals(fake.clientIds[0], fake.clientIds[1])
    }

    @Test fun free_comparison_opens_paywall_and_confirmed_pro_unlocks_feature() {
        entitlements.setAccess(AccessState.Free)
        reachComparisonGate()
        composeRule.onNodeWithTag("compare_button").performScrollTo().performClick()
        composeRule.onNodeWithTag("revenuecat_paywall").assertIsDisplayed()
        composeRule.onNodeWithTag("revenuecat_price").assertIsDisplayed()
        captureV08("paywall-free")
        composeRule.onNodeWithTag("purchase_pro").performScrollTo().performClick()
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("comparison_screen").fetchSemanticsNodes().isNotEmpty()}
        composeRule.onNodeWithTag("comparison_screen").assertIsDisplayed()
    }

    @Test fun cancelled_purchase_keeps_comparison_locked_and_paywall_usable() {
        entitlements.setAccess(AccessState.Free);entitlements.nextPurchase=PurchaseResult.Cancelled
        reachComparisonGate();composeRule.onNodeWithTag("compare_button").performScrollTo().performClick()
        composeRule.onNodeWithTag("purchase_pro").performScrollTo().performClick()
        composeRule.onNodeWithTag("revenuecat_paywall").assertIsDisplayed()
        composeRule.onNodeWithTag("purchase_pro").assertIsDisplayed()
    }

    @Test fun failed_purchase_shows_recoverable_message_and_stays_free() {
        entitlements.setAccess(AccessState.Free);entitlements.nextPurchase=PurchaseResult.Failed("simulated")
        reachComparisonGate();composeRule.onNodeWithTag("compare_button").performScrollTo().performClick()
        composeRule.onNodeWithTag("purchase_pro").performScrollTo().performClick()
        composeRule.onNodeWithText("The purchase couldn’t be completed.").assertIsDisplayed()
        composeRule.onNodeWithTag("revenuecat_paywall").assertIsDisplayed()
    }

    @Test fun restore_pro_unlocks_full_comparison() {
        entitlements.setAccess(AccessState.Free)
        reachComparisonGate();composeRule.onNodeWithTag("compare_button").performScrollTo().performClick()
        composeRule.onNodeWithTag("restore_purchases").performScrollTo().performClick()
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("comparison_screen").fetchSemanticsNodes().isNotEmpty()}
        composeRule.onNodeWithTag("comparison_screen").assertIsDisplayed()
    }

    @Test fun portuguese_paywall_uses_localized_copy_and_remote_product_metadata() {
        entitlements.setAccess(AccessState.Free)
        composeRule.onNodeWithTag("language_selector").performClick()
        composeRule.onNodeWithText("Português (Brasil)").performClick()
        reachComparisonGate();composeRule.onNodeWithTag("compare_button").performScrollTo().performClick()
        composeRule.onNodeWithText("Continue o Second Take").assertIsDisplayed()
        composeRule.onNodeWithText("R$ 19,90 / mês").assertIsDisplayed()
        captureV08("paywall-ptbr")
    }

    private fun reachComparisonGate(){
        composeRule.onNodeWithTag("start_conversation").performScrollTo().performClick();awaitInput();send("I am worried about the project")
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("turning_point").fetchSemanticsNodes().isNotEmpty()}
        composeRule.onNodeWithTag("rewind_button").performScrollTo().performClick()
        composeRule.waitUntil(4_000){composeRule.onAllNodesWithTag("checkpoint").fetchSemanticsNodes().isNotEmpty()}
        send("Can you finish today?")
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("intent_lock").fetchSemanticsNodes().isNotEmpty()}
        composeRule.onNodeWithTag("intent_REQUEST_COMPLETION").performScrollTo().performClick()
        composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("compare_button").fetchSemanticsNodes().isNotEmpty()}
    }

    private fun send(text:String){composeRule.onNodeWithTag("free_text_input").performTextInput(text);composeRule.waitForIdle();composeRule.onNodeWithTag("send_turn").performClick()}
    private fun awaitInput(){composeRule.waitUntil(3_000){composeRule.onAllNodesWithTag("free_text_input").fetchSemanticsNodes().isNotEmpty()}}
    private fun capture(name:String,waitForIdle:Boolean=true){if(waitForIdle)composeRule.waitForIdle();Thread.sleep(180);val instrumentation=InstrumentationRegistry.getInstrumentation();val dir=File(instrumentation.targetContext.getExternalFilesDir(null),"v071-gold").apply{mkdirs()};FileOutputStream(File(dir,"$name.png")).use{instrumentation.uiAutomation.takeScreenshot().compress(Bitmap.CompressFormat.PNG,100,it)};if(InstrumentationRegistry.getArguments().getString("recordingMode")=="true")Thread.sleep(3_000)}
    private fun captureV08(name:String){composeRule.waitForIdle();Thread.sleep(180);val instrumentation=InstrumentationRegistry.getInstrumentation();val dir=File(instrumentation.targetContext.getExternalFilesDir(null),"v08-controlled").apply{mkdirs()};FileOutputStream(File(dir,"$name.png")).use{instrumentation.uiAutomation.takeScreenshot().compress(Bitmap.CompressFormat.PNG,100,it)}}

    private class InstrumentedFakeRepository : ConversationRepository {
        var session=initial();var failNext=false;var confirmedIntent:String?=null;var nextTurnGate:CompletableDeferred<Unit>?=null;var confirmGate:CompletableDeferred<Unit>?=null;val clientIds=mutableListOf<String>();private var count=0
        fun reset(){session=initial();failNext=false;confirmedIntent=null;nextTurnGate=null;confirmGate=null;clientIds.clear();count=0}
        override suspend fun health()=true
        override suspend fun ready()=true
        override suspend fun startSession(locale:LocaleTag)=session.copy(locale=locale).also{session=it}
        override suspend fun getSession(sessionId:String)=session
        override suspend fun sendTurn(sessionId:String,text:String,clientTurnId:String):BackendOutcome {clientIds+=clientTurnId;if(failNext){failNext=false;throw ConversationClientError.Connection(IllegalStateException("offline"))};nextTurnGate?.let{gate->nextTurnGate=null;gate.await()};count++;val turnId="t$count";val user=VisibleMessage("u$count",MessageRole.USER,text,turnId);session=session.copy(messages=session.messages+user);if(text.contains("capital da França",ignoreCase=true))return BackendOutcome.OutOfScope(turnId,session,"Este treino funciona melhor quando a fala está ligada à conversa que você está ensaiando.");if(count==2){val choices=options(session.locale);session=session.copy(pendingIntentLockTurnId=turnId,pendingIntentLockOptions=choices);return BackendOutcome.IntentLockRequired(turnId,session,choices)};return alex(turnId)}
        override suspend fun confirmIntent(sessionId:String,turnId:String,confirmedIntent:String):BackendOutcome.AlexReply {this.confirmedIntent=confirmedIntent;confirmGate?.let{gate->confirmGate=null;gate.await()};return alex(turnId)}
        override suspend fun rewind(sessionId:String,snapshotId:String):PublicConversation {session=session.copy(messages=emptyList(),activeBranch="branch-b",pendingIntentLockTurnId=null,pendingIntentLockOptions=emptyList());return session}
        private fun alex(turnId:String):BackendOutcome.AlexReply {val copy=if(session.locale.value=="pt-BR")"Eu entendi. Posso explicar onde parei e combinar com você o que consigo entregar primeiro, sem prometer um prazo que ainda não confirmei." else "I understand. I can explain where I stopped and agree with you on what I can deliver first, without promising a deadline I have not confirmed.";val message=VisibleMessage("a$count",MessageRole.ALEX,copy,turnId);session=session.copy(messages=session.messages+message,pendingIntentLockTurnId=null,pendingIntentLockOptions=emptyList());return BackendOutcome.AlexReply(turnId,session,message,SelectionSource.REMOTE)}
        companion object {private fun initial()=PublicConversation("instrumented-session",LocaleTag("en-US"),emptyList(),emptySet(),"main");private fun options(locale:LocaleTag)=if(locale.value=="pt-BR")listOf(IntentOption("ASK_CAPABILITY","Saber se Alex consegue terminar hoje"),IntentOption("REQUEST_COMPLETION","Pedir para Alex terminar hoje"))else listOf(IntentOption("ASK_CAPABILITY","Find out if Alex can finish today"),IntentOption("REQUEST_COMPLETION","Ask Alex to finish today"))}
    }
}
