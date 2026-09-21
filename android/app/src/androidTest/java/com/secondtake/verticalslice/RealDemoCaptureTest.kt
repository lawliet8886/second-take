package com.secondtake.verticalslice

import android.os.SystemClock
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.platform.app.InstrumentationRegistry
import com.secondtake.verticalslice.billing.AccessState
import com.secondtake.verticalslice.billing.RevenueCatEntitlementRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test

/** Opt-in capture of the real configured backend and real Test Store, never fixtures. */
class RealDemoCaptureTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Test fun record_current_connected_app() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("runRealCapture") == "true")
        assertTrue(BuildConfig.REVENUECAT_ENABLED && BuildConfig.REVENUECAT_API_KEY.startsWith("test_"))
        assertNull(SecondTakeAppGraph.repositoryOverride)
        assertNull(SecondTakeAppGraph.entitlementRepositoryOverride)
        mark("intro", 5)
        composeRule.onNodeWithTag("start_conversation").performScrollTo().performClick()
        waitTag("free_text_input")
        send("I am worried about the project")
        waitForReply("turning_point")
        mark("attempt-a", 7)
        composeRule.onNodeWithTag("rewind_button").performScrollTo()
        mark("rewind-action", 2)
        composeRule.onNodeWithTag("rewind_button").performClick()
        waitTag("checkpoint")
        mark("checkpoint", 5)
        send("Can you finish today?")
        waitForReply("intent_lock")
        composeRule.onNodeWithTag("intent_lock").performScrollTo()
        mark("intent-lock", 7)
        composeRule.onNodeWithTag("intent_REQUEST_COMPLETION").performScrollTo().performClick()
        waitForReply("compare_button")
        composeRule.onNodeWithTag("compare_button").performScrollTo()
        mark("attempt-b", 7)
        composeRule.onNodeWithTag("compare_button").performClick()
        composeRule.waitUntil(15_000) { exists("revenuecat_paywall") || exists("comparison_screen") }
        if (exists("revenuecat_paywall")) {
            mark("test-store-paywall", 6)
            composeRule.onNodeWithTag("purchase_pro").performScrollTo().performClick()
            mark("test-store-sheet", 5)
            onView(withText("TEST VALID PURCHASE")).perform(click())
        }
        waitTag("comparison_screen")
        val billing = RevenueCatEntitlementRepository()
        runBlocking { billing.refreshCustomerInfo(); assertEquals(AccessState.Pro, billing.accessState.value) }
        mark("comparison-top", 10)
        composeRule.onNodeWithText("VERSION B").performScrollTo()
        mark("comparison-b", 10)
        composeRule.onNodeWithText("What would you clarify next?").performScrollTo()
        mark("reflection", 8)
        composeRule.onNodeWithTag("comparison_back").performScrollTo()
        mark("comparison-end", 4)
        println("V6_CAPTURE_VERIFIED realBackend=true realTestStorePro=true fakeOverrides=false")
    }

    private fun exists(tag: String) = composeRule.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty()
    private fun waitTag(tag: String) = composeRule.waitUntil(35_000) { exists(tag) }
    private fun send(text: String) {
        composeRule.onNodeWithTag("free_text_input").performTextInput(text)
        composeRule.onNodeWithTag("send_turn").performClick()
    }
    private fun waitForReply(tag: String) {
        composeRule.waitUntil(35_000) { exists(tag) || exists("recovery_card") }
        check(exists(tag)) { "Real provider did not reach $tag; preserve the failed capture, do not simulate success." }
    }
    private fun mark(stage: String, seconds: Long) {
        composeRule.waitForIdle()
        println("V6_CAPTURE_STAGE $stage elapsedMs=${SystemClock.elapsedRealtime()}")
        Thread.sleep(seconds * 1_000)
    }
}
