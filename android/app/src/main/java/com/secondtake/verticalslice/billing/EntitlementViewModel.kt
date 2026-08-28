package com.secondtake.verticalslice.billing

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class EntitlementUiState(
    val access: AccessState = AccessState.Loading,
    val product: PaywallProduct? = null,
    val paywallVisible: Boolean = false,
    val purchaseInProgress: Boolean = false,
    val restoreInProgress: Boolean = false,
    val offeringLoading: Boolean = false,
    val message: EntitlementMessage? = null,
    val openFullComparison: Boolean = false,
)

enum class EntitlementMessage {
    PURCHASE_FAILED,
    RESTORE_FAILED,
    NOTHING_TO_RESTORE,
    OFFERING_UNAVAILABLE,
}

class EntitlementViewModel(
    private val repository: EntitlementRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(EntitlementUiState())
    val uiState: StateFlow<EntitlementUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch { repository.accessState.collectLatest { update { copy(access = it) } } }
        viewModelScope.launch { repository.product.collectLatest { update { copy(product = it) } } }
        viewModelScope.launch { repository.refreshCustomerInfo() }
    }

    fun requestFullComparison() {
        if (_uiState.value.access == AccessState.Pro) {
            update { copy(openFullComparison = true, message = null) }
        } else {
            update { copy(paywallVisible = true, message = null) }
            loadOffering()
        }
    }

    fun dismissPaywall() {
        if (!_uiState.value.purchaseInProgress) update { copy(paywallVisible = false, message = null) }
    }

    fun loadOffering() {
        if (_uiState.value.offeringLoading) return
        update { copy(offeringLoading = true, message = null) }
        viewModelScope.launch {
            repository.loadCurrentOffering()
            update {
                copy(
                    offeringLoading = false,
                    message = if (repository.product.value == null) EntitlementMessage.OFFERING_UNAVAILABLE else null,
                )
            }
        }
    }

    fun purchase(activity: Activity) {
        if (_uiState.value.purchaseInProgress || _uiState.value.product == null) return
        update { copy(purchaseInProgress = true, message = null) }
        viewModelScope.launch {
            when (repository.purchase(activity)) {
                PurchaseResult.ProActivated -> update {
                    copy(purchaseInProgress = false, paywallVisible = false, openFullComparison = true, message = null)
                }
                PurchaseResult.Cancelled -> update { copy(purchaseInProgress = false, message = null) }
                is PurchaseResult.Failed -> update {
                    copy(purchaseInProgress = false, message = EntitlementMessage.PURCHASE_FAILED)
                }
            }
        }
    }

    fun restore() {
        if (_uiState.value.restoreInProgress || _uiState.value.purchaseInProgress) return
        update { copy(restoreInProgress = true, message = null) }
        viewModelScope.launch {
            when (repository.restore()) {
                RestoreResult.ProRestored -> update {
                    copy(restoreInProgress = false, paywallVisible = false, openFullComparison = true, message = null)
                }
                RestoreResult.NoActiveEntitlement -> update {
                    copy(restoreInProgress = false, message = EntitlementMessage.NOTHING_TO_RESTORE)
                }
                is RestoreResult.Failed -> update {
                    copy(restoreInProgress = false, message = EntitlementMessage.RESTORE_FAILED)
                }
            }
        }
    }

    fun consumeOpenFullComparison() = update { copy(openFullComparison = false) }
    fun clearMessage() = update { copy(message = null) }

    private inline fun update(block: EntitlementUiState.() -> EntitlementUiState) {
        _uiState.value = _uiState.value.block()
    }
}
