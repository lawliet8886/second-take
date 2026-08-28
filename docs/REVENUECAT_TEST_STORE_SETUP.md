# RevenueCat Test Store setup v0.8

Official documentation consulted on 2026-08-28:

- https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
- https://www.revenuecat.com/docs/getting-started/configuring-sdk
- https://www.revenuecat.com/docs/getting-started/displaying-products
- https://www.revenuecat.com/docs/getting-started/making-purchases
- https://www.revenuecat.com/docs/getting-started/restoring-purchases
- https://www.revenuecat.com/docs/customers/customer-info
- https://github.com/RevenueCat/purchases-android/releases/tag/10.19.1

Test Store requires Android SDK 9.9.0 or newer. This project uses current stable 10.19.1. Test Store purchases behave like real purchases for SDK purposes: they update CustomerInfo, trigger entitlements, and appear as sandbox data in RevenueCat. Monthly Test Store subscriptions renew every five minutes, up to five renewals, then expire and deactivate their entitlement.

## Reproducible dashboard configuration

1. Create/open the Second Take RevenueCat project.
2. Under Apps and providers, create a Test Store app.
3. Under Product catalog, create the monthly subscription. The qualified project uses final identifier `monthly` and display name `Monthly`.
4. Create entitlement `pro` and attach that product.
5. Create offering `default`, make it current/default, and attach the product as its monthly package (normally `$rc_monthly`).
6. In Project settings > API keys, copy the public Test Store SDK key into local `second-take-android/local.properties` as `REVENUECAT_TEST_STORE_API_KEY=...`.
7. Build/install the debug app. Never ship a store build with a Test Store key.

The local key file is ignored by Git. Do not use a RevenueCat secret REST key. Test Store is explicitly permitted for the RevenueCat Next Gen Shipaton integration; Google Play publication is not required for this demonstration.

## Qualified project snapshot

- RevenueCat project: Second Take.
- App/provider: Test Store only.
- Product: `monthly`, monthly subscription, default USD display price $9.99.
- Entitlement: `pro`.
- Offering: `default`.
- Package: `$rc_monthly`.
- Identity: anonymous RevenueCat App User IDs; no Firebase/login layer.

The Dashboard account currently shows an email-confirmation reminder. It did not block Test Store setup, purchases, CustomerInfo, restore, or evidence collection.
