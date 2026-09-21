# RevenueCat Test Store setup v0.8

Official documentation rechecked on 2026-09-21:

- https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
- https://www.revenuecat.com/docs/getting-started/configuring-sdk
- https://www.revenuecat.com/docs/getting-started/displaying-products
- https://www.revenuecat.com/docs/getting-started/making-purchases
- https://www.revenuecat.com/docs/getting-started/restoring-purchases
- https://www.revenuecat.com/docs/customers/customer-info
- https://revenuecat-shipaton-2026.devpost.com/forum_topics/44695-next-gen-eligibility-is-a-test-store-only-purchase-sufficient

RevenueCat currently documents Android SDK 9.9.0 as the minimum version with Test Store support. This project pins RevenueCat Android SDK **10.19.1**. Test Store purchases behave like purchases for SDK testing purposes: they update `CustomerInfo`, trigger entitlements, and appear as sandbox data in RevenueCat. Monthly Test Store subscriptions renew every five minutes, up to five renewals, then expire and deactivate their entitlement.

RevenueCat's Shipaton manager has also explicitly confirmed in the official Devpost discussion that **Test Store is enough for the Next Gen category**.

## Reproducible dashboard configuration

1. Create/open the Second Take RevenueCat project.
2. Under Apps and providers, create a Test Store app.
3. Under Product catalog, create the monthly subscription. The submitted project uses identifier `monthly` and display name `Monthly`.
4. Create entitlement `pro` and attach that product.
5. Create offering `default`, make it current/default, and attach the product as its monthly package (normally `$rc_monthly`).
6. In Project settings > API keys, copy the **public Test Store SDK key** into untracked `android/local.properties` as `REVENUECAT_TEST_STORE_API_KEY=...`.
7. Build/install the debug app. Never ship a store build with a Test Store key.

The local key file is ignored by Git. Do not use a RevenueCat secret REST key. Google Play publication is not required for a Next Gen submission.

## Verified project snapshot

The authenticated dashboard and zero-cost Test Store flow were revalidated on 2026-09-21. The public SDK key was used ephemerally for the local debug build and was not printed, written to a tracked file, or committed.

- RevenueCat project: Second Take.
- App/provider: Test Store only.
- Product: `monthly`, monthly subscription, default USD display price $9.99 in the recorded setup.
- Entitlement: `pro`.
- Offering: `default`.
- Package: `$rc_monthly`.
- Identity: anonymous RevenueCat App User IDs; no Firebase/login layer.

The live run loaded `default` / `$rc_monthly` / `monthly`, completed `TEST VALID PURCHASE`, observed active `pro` through `CustomerInfo`, retained `pro` after Activity relaunch, and returned `ProRestored` from restore. This was a sandbox transaction with no card or real charge.

For an explicit live recheck, first provide the public key through ignored `android/local.properties`, start an emulator, and run only the opt-in smoke test:

```powershell
.\gradlew.bat connectedDebugAndroidTest '-Pandroid.testInstrumentationRunnerArguments.class=com.secondtake.verticalslice.RevenueCatPurchaseSmokeTest' '-Pandroid.testInstrumentationRunnerArguments.runRevenueCatPurchase=true'
```

The test verifies offering/product metadata, selects RevenueCat's zero-cost `TEST VALID PURCHASE` action, requires active `pro`, relaunches the Activity, refreshes `CustomerInfo`, and restores. Without the explicit opt-in argument it is skipped.

## Safety boundary

The Shipaton demo is a development build. Test Store is used only in debug/development configuration. Release builds in this repository deliberately receive no Test Store key and compile with RevenueCat disabled.
