package com.secondtake.verticalslice.billing

import android.app.Activity
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EntitlementViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val activity = mockk<Activity>(relaxed = true)
    @Before fun setup() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun `free user requesting comparison sees remotely loaded offering`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository()
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle()
        assertTrue(vm.uiState.value.paywallVisible)
        assertEquals(PRODUCT, vm.uiState.value.product)
        assertFalse(vm.uiState.value.openFullComparison)
    }

    @Test fun `pro user opens comparison without paywall`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository(AccessState.Pro)
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle()
        assertTrue(vm.uiState.value.openFullComparison)
        assertFalse(vm.uiState.value.paywallVisible)
    }

    @Test fun `purchase only unlocks after repository confirms pro`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository().apply { purchaseResult = PurchaseResult.ProActivated }
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle(); vm.purchase(activity); advanceUntilIdle()
        assertEquals(AccessState.Pro, vm.uiState.value.access)
        assertTrue(vm.uiState.value.openFullComparison)
        assertFalse(vm.uiState.value.paywallVisible)
        assertEquals(1, repo.purchaseCalls)
    }

    @Test fun `cancel leaves user free and paywall usable`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository().apply { purchaseResult = PurchaseResult.Cancelled }
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle(); vm.purchase(activity); advanceUntilIdle()
        assertEquals(AccessState.Free, vm.uiState.value.access)
        assertTrue(vm.uiState.value.paywallVisible)
        assertFalse(vm.uiState.value.purchaseInProgress)
        assertNull(vm.uiState.value.message)
    }

    @Test fun `purchase failure reports recoverable feedback`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository().apply { purchaseResult = PurchaseResult.Failed("test failure") }
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle(); vm.purchase(activity); advanceUntilIdle()
        assertEquals(EntitlementMessage.PURCHASE_FAILED, vm.uiState.value.message)
        assertTrue(vm.uiState.value.paywallVisible)
    }

    @Test fun `restore active purchase unlocks comparison`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository().apply { restoreResult = RestoreResult.ProRestored }
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle(); vm.restore(); advanceUntilIdle()
        assertEquals(AccessState.Pro, vm.uiState.value.access)
        assertTrue(vm.uiState.value.openFullComparison)
        assertEquals(1, repo.restoreCalls)
    }

    @Test fun `restore without entitlement stays free`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository().apply { restoreResult = RestoreResult.NoActiveEntitlement }
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle(); vm.restore(); advanceUntilIdle()
        assertEquals(AccessState.Free, vm.uiState.value.access)
        assertEquals(EntitlementMessage.NOTHING_TO_RESTORE, vm.uiState.value.message)
    }

    @Test fun `missing offering produces retryable unavailable state`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository().apply { offeringAvailable = false }
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle()
        assertNull(vm.uiState.value.product)
        assertEquals(EntitlementMessage.OFFERING_UNAVAILABLE, vm.uiState.value.message)
    }

    @Test fun `customer info expiration removes pro access`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository(AccessState.Pro)
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); repo.expire(); advanceUntilIdle()
        assertEquals(AccessState.Free, vm.uiState.value.access)
    }

    @Test fun `double purchase tap starts only one transaction`() = runTest(dispatcher) {
        val repo = FakeEntitlementRepository()
        val vm = EntitlementViewModel(repo)
        advanceUntilIdle(); vm.requestFullComparison(); advanceUntilIdle()
        vm.purchase(activity); vm.purchase(activity); advanceUntilIdle()
        assertEquals(1, repo.purchaseCalls)
    }

    private class FakeEntitlementRepository(initial: AccessState = AccessState.Free) : EntitlementRepository {
        private val _access = MutableStateFlow(initial)
        override val accessState: StateFlow<AccessState> = _access
        private val _product = MutableStateFlow<PaywallProduct?>(null)
        override val product: StateFlow<PaywallProduct?> = _product
        var offeringAvailable = true
        var purchaseResult: PurchaseResult = PurchaseResult.ProActivated
        var restoreResult: RestoreResult = RestoreResult.ProRestored
        var purchaseCalls = 0
        var restoreCalls = 0
        override suspend fun refreshCustomerInfo() = Unit
        override suspend fun loadCurrentOffering() { _product.value = if (offeringAvailable) PRODUCT else null }
        override suspend fun purchase(activity: Activity): PurchaseResult {
            purchaseCalls++
            if (purchaseResult == PurchaseResult.ProActivated) _access.value = AccessState.Pro
            return purchaseResult
        }
        override suspend fun restore(): RestoreResult {
            restoreCalls++
            if (restoreResult == RestoreResult.ProRestored) _access.value = AccessState.Pro
            return restoreResult
        }
        fun expire() { _access.value = AccessState.Free }
    }

    companion object {
        private val PRODUCT = PaywallProduct("second_take_pro_monthly", "${'$'}rc_monthly", "Second Take Pro", "R$ 19,90", "P1M")
    }
}
