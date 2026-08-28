package com.secondtake.verticalslice

import android.app.Application
import android.util.Log
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class SecondTakeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.REVENUECAT_ENABLED && BuildConfig.REVENUECAT_API_KEY.isNotBlank()) {
            Purchases.logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.INFO
            Purchases.configure(PurchasesConfiguration.Builder(this, BuildConfig.REVENUECAT_API_KEY).build())
            Log.i(TAG, "RevenueCat configured for this build")
        } else {
            Log.i(TAG, "RevenueCat disabled: no public SDK key configured")
        }
    }

    companion object { private const val TAG = "SecondTakeRevenueCat" }
}
