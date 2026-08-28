package com.secondtake.verticalslice.billing

import android.app.Activity
import kotlinx.coroutines.flow.StateFlow

sealed interface AccessState {
    data object Loading : AccessState
    data object Free : AccessState
    data object Pro : AccessState
    data class Unavailable(val reason: String) : AccessState
}

data class PaywallProduct(
    val productId: String,
    val packageId: String,
    val title: String,
    val formattedPrice: String,
    val periodIso8601: String?,
)

sealed interface PurchaseResult {
    data object ProActivated : PurchaseResult
    data object Cancelled : PurchaseResult
    data class Failed(val message: String) : PurchaseResult
}

sealed interface RestoreResult {
    data object ProRestored : RestoreResult
    data object NoActiveEntitlement : RestoreResult
    data class Failed(val message: String) : RestoreResult
}

interface EntitlementRepository {
    val accessState: StateFlow<AccessState>
    val product: StateFlow<PaywallProduct?>
    suspend fun refreshCustomerInfo()
    suspend fun loadCurrentOffering()
    suspend fun purchase(activity: Activity): PurchaseResult
    suspend fun restore(): RestoreResult
}
