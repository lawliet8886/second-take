package com.secondtake.verticalslice.billing

import android.app.Activity
import android.util.Log
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.getCustomerInfoWith
import com.revenuecat.purchases.getOfferingsWith
import com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener
import com.revenuecat.purchases.purchaseWith
import com.revenuecat.purchases.restorePurchasesWith
import kotlin.coroutines.resume
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine

class RevenueCatEntitlementRepository(
    private val purchases: Purchases = Purchases.sharedInstance,
) : EntitlementRepository {
    private val _accessState = MutableStateFlow<AccessState>(AccessState.Loading)
    override val accessState: StateFlow<AccessState> = _accessState.asStateFlow()
    private val _product = MutableStateFlow<PaywallProduct?>(null)
    override val product: StateFlow<PaywallProduct?> = _product.asStateFlow()
    private var selectedPackage: Package? = null

    init {
        purchases.updatedCustomerInfoListener = UpdatedCustomerInfoListener(::acceptCustomerInfo)
    }

    override suspend fun refreshCustomerInfo(): Unit = suspendCancellableCoroutine { continuation ->
        purchases.getCustomerInfoWith(
            onError = { error ->
                Log.w(TAG, "CustomerInfo refresh failed: ${error.code}")
                if (_accessState.value == AccessState.Loading) _accessState.value = AccessState.Unavailable(error.message)
                if (continuation.isActive) continuation.resume(Unit)
            },
            onSuccess = { info ->
                acceptCustomerInfo(info)
                if (continuation.isActive) continuation.resume(Unit)
            },
        )
    }

    override suspend fun loadCurrentOffering(): Unit = suspendCancellableCoroutine { continuation ->
        purchases.getOfferingsWith(
            onError = { error ->
                Log.w(TAG, "Offering fetch failed: ${error.code}")
                selectedPackage = null
                _product.value = null
                if (continuation.isActive) continuation.resume(Unit)
            },
            onSuccess = { offerings ->
                val current = offerings.current
                val candidate = current?.monthly ?: current?.availablePackages?.firstOrNull()
                selectedPackage = candidate
                _product.value = candidate?.let { packageToProduct(it) }
                if (continuation.isActive) continuation.resume(Unit)
            },
        )
    }

    override suspend fun purchase(activity: Activity): PurchaseResult {
        val packageToPurchase = selectedPackage ?: return PurchaseResult.Failed("No package is available")
        return suspendCancellableCoroutine { continuation ->
            val params = PurchaseParams.Builder(activity, packageToPurchase).build()
            purchases.purchaseWith(
                purchaseParams = params,
                onError = { error, userCancelled ->
                    Log.d(TAG, if (userCancelled) "Purchase cancelled" else "Purchase failed: ${error.code}")
                    if (continuation.isActive) {
                        continuation.resume(if (userCancelled) PurchaseResult.Cancelled else PurchaseResult.Failed(error.message))
                    }
                },
                onSuccess = { _, info ->
                    acceptCustomerInfo(info)
                    if (continuation.isActive) {
                        continuation.resume(
                            if (isPro(info)) PurchaseResult.ProActivated
                            else PurchaseResult.Failed("Purchase completed without an active pro entitlement"),
                        )
                    }
                },
            )
        }
    }

    override suspend fun restore(): RestoreResult = suspendCancellableCoroutine { continuation ->
        purchases.restorePurchasesWith(
            onError = { error ->
                Log.w(TAG, "Restore failed: ${error.code}")
                if (continuation.isActive) continuation.resume(RestoreResult.Failed(error.message))
            },
            onSuccess = { info ->
                acceptCustomerInfo(info)
                if (continuation.isActive) {
                    continuation.resume(if (isPro(info)) RestoreResult.ProRestored else RestoreResult.NoActiveEntitlement)
                }
            },
        )
    }

    private fun acceptCustomerInfo(info: CustomerInfo) {
        val active = isPro(info)
        _accessState.value = if (active) AccessState.Pro else AccessState.Free
        Log.d(TAG, "CustomerInfo updated; proActive=$active sandbox=${info.entitlements[PRO_ENTITLEMENT]?.isSandbox}")
    }

    private fun packageToProduct(value: Package): PaywallProduct {
        val storeProduct = value.product
        return PaywallProduct(
            productId = storeProduct.id,
            packageId = value.identifier,
            title = storeProduct.title,
            formattedPrice = storeProduct.price.formatted,
            periodIso8601 = storeProduct.period?.iso8601,
        )
    }

    private fun isPro(info: CustomerInfo): Boolean = info.entitlements[PRO_ENTITLEMENT]?.isActive == true

    companion object {
        const val PRO_ENTITLEMENT = "pro"
        private const val TAG = "SecondTakeRevenueCat"
    }
}

class DisabledEntitlementRepository : EntitlementRepository {
    private val _access = MutableStateFlow<AccessState>(AccessState.Unavailable("RevenueCat Test Store is not configured"))
    private val _product = MutableStateFlow<PaywallProduct?>(null)
    override val accessState: StateFlow<AccessState> = _access.asStateFlow()
    override val product: StateFlow<PaywallProduct?> = _product.asStateFlow()
    override suspend fun refreshCustomerInfo() = Unit
    override suspend fun loadCurrentOffering() = Unit
    override suspend fun purchase(activity: Activity): PurchaseResult = PurchaseResult.Failed("RevenueCat is unavailable")
    override suspend fun restore(): RestoreResult = RestoreResult.Failed("RevenueCat is unavailable")
}
