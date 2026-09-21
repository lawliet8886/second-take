package com.secondtake.verticalslice

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.secondtake.verticalslice.billing.AccessState
import com.secondtake.verticalslice.billing.PurchaseResult
import com.secondtake.verticalslice.billing.RestoreResult
import com.secondtake.verticalslice.billing.RevenueCatEntitlementRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Opt-in, environment-qualified RevenueCat Test Store purchase verification.
 * The normal connected suite skips it so it can never create sandbox activity by accident.
 */
@RunWith(AndroidJUnit4::class)
class RevenueCatPurchaseSmokeTest {
    @Test
    fun test_store_purchase_activates_pro_and_restores_after_relaunch() {
        val arguments = InstrumentationRegistry.getArguments()
        assumeTrue(arguments.getString("runRevenueCatPurchase") == "true")
        assumeTrue(BuildConfig.REVENUECAT_ENABLED)

        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            lateinit var activity: MainActivity
            scenario.onActivity { activity = it }

            runBlocking {
                val repository = RevenueCatEntitlementRepository()
                repository.refreshCustomerInfo()
                repository.loadCurrentOffering()

                val product = repository.product.value
                assertNotNull(product)
                assertEquals("monthly", product?.productId)
                assertEquals("${'$'}rc_monthly", product?.packageId)

                val purchase = async(Dispatchers.Main) { repository.purchase(activity) }
                onView(withText("TEST VALID PURCHASE"))
                    .check(matches(isDisplayed()))
                    .perform(click())
                assertEquals(PurchaseResult.ProActivated, purchase.await())
                assertEquals(AccessState.Pro, repository.accessState.value)
            }
        }

        ActivityScenario.launch(MainActivity::class.java).use {
            runBlocking {
                val relaunchedRepository = RevenueCatEntitlementRepository()
                relaunchedRepository.refreshCustomerInfo()
                assertEquals(AccessState.Pro, relaunchedRepository.accessState.value)
                assertEquals(RestoreResult.ProRestored, relaunchedRepository.restore())
                assertEquals(AccessState.Pro, relaunchedRepository.accessState.value)
            }
        }
    }
}
