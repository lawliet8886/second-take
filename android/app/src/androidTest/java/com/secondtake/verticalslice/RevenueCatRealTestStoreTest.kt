package com.secondtake.verticalslice

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.secondtake.verticalslice.billing.AccessState
import com.secondtake.verticalslice.billing.RestoreResult
import com.secondtake.verticalslice.billing.RevenueCatEntitlementRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Environment-qualified Test Store check. It is skipped when the ignored local
 * RevenueCat public SDK key is absent and never replaces the deterministic fake suite.
 */
@RunWith(AndroidJUnit4::class)
class RevenueCatRealTestStoreTest {
    @Test
    fun active_anonymous_customer_restores_pro_twice() = runBlocking {
        assumeTrue(BuildConfig.REVENUECAT_ENABLED)

        val repository = RevenueCatEntitlementRepository()
        repository.refreshCustomerInfo()
        assertEquals(AccessState.Pro, repository.accessState.value)

        assertEquals(RestoreResult.ProRestored, repository.restore())
        assertEquals(RestoreResult.ProRestored, repository.restore())
        assertEquals(AccessState.Pro, repository.accessState.value)
    }
}
