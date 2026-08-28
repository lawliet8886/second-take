package com.secondtake.verticalslice

import android.app.Activity
import com.secondtake.verticalslice.billing.AccessState
import com.secondtake.verticalslice.billing.EntitlementRepository
import com.secondtake.verticalslice.billing.PaywallProduct
import com.secondtake.verticalslice.billing.PurchaseResult
import com.secondtake.verticalslice.billing.RestoreResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class InstrumentedEntitlementRepository(initial: AccessState = AccessState.Pro) : EntitlementRepository {
    private val _access = MutableStateFlow(initial)
    override val accessState: StateFlow<AccessState> = _access
    private val _product = MutableStateFlow<PaywallProduct?>(PRODUCT)
    override val product: StateFlow<PaywallProduct?> = _product
    var nextPurchase: PurchaseResult = PurchaseResult.ProActivated
    var nextRestore: RestoreResult = RestoreResult.ProRestored
    override suspend fun refreshCustomerInfo() = Unit
    override suspend fun loadCurrentOffering() = Unit
    override suspend fun purchase(activity: Activity): PurchaseResult = nextPurchase.also { if (it == PurchaseResult.ProActivated) _access.value = AccessState.Pro }
    override suspend fun restore(): RestoreResult = nextRestore.also { if (it == RestoreResult.ProRestored) _access.value = AccessState.Pro }
    fun setAccess(value: AccessState) { _access.value = value }
    companion object { val PRODUCT = PaywallProduct("second_take_pro_monthly", "${'$'}rc_monthly", "Second Take Pro Monthly", "R$ 19,90", "P1M") }
}
