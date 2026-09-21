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

## Submitted project snapshot

This is the recorded submission configuration, not a claim that the live dashboard was revalidated on 2026-09-21. The current checkout contained no `REVENUECAT_TEST_STORE_API_KEY`, and authenticated dashboard inspection could not be completed.

- RevenueCat project: Second Take.
- App/provider: Test Store only.
- Product: `monthly`, monthly subscription, default USD display price $9.99 in the recorded setup.
- Entitlement: `pro`.
- Offering: `default`.
- Package: `$rc_monthly`.
- Identity: anonymous RevenueCat App User IDs; no Firebase/login layer.

## Safety boundary

The Shipaton demo is a development build. Test Store is used only in debug/development configuration. Release builds in this repository deliberately receive no Test Store key and compile with RevenueCat disabled.
