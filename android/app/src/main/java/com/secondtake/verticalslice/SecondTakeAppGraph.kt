package com.secondtake.verticalslice

import com.secondtake.verticalslice.data.RemoteConversationRepository
import com.secondtake.verticalslice.data.remote.SecondTakeApi
import com.secondtake.verticalslice.domain.ConversationRepository
import com.secondtake.verticalslice.billing.DisabledEntitlementRepository
import com.secondtake.verticalslice.billing.EntitlementRepository
import com.secondtake.verticalslice.billing.RevenueCatEntitlementRepository

object SecondTakeAppGraph {
    @Volatile var repositoryOverride: ConversationRepository? = null
    @Volatile var entitlementRepositoryOverride: EntitlementRepository? = null
    private val remote by lazy { RemoteConversationRepository(SecondTakeApi(BuildConfig.SECOND_TAKE_BACKEND_URL)) }
    private val revenueCat by lazy {
        if (BuildConfig.REVENUECAT_ENABLED) RevenueCatEntitlementRepository() else DisabledEntitlementRepository()
    }
    fun repository(): ConversationRepository = repositoryOverride ?: remote
    fun entitlementRepository(): EntitlementRepository = entitlementRepositoryOverride ?: revenueCat
}
