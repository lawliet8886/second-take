# RevenueCat architecture v0.8

RevenueCat is a client-side subsystem independent from the local conversation backend. The backend remains authoritative for conversation state, hidden facts, Fork snapshots, Policy candidates, graph transitions, and Alex utterances. RevenueCat owns only Offering retrieval, purchase orchestration, `CustomerInfo`, entitlement state, and restore.

## Runtime

1. `SecondTakeApplication` configures `Purchases` once when a debug Test Store public SDK key is present.
2. `RevenueCatEntitlementRepository` maps SDK objects to `AccessState` and `PaywallProduct`.
3. `EntitlementViewModel` owns paywall, loading, purchase, restore, and feature-unlock state.
4. The existing Full Comparison CTA asks the ViewModel for access.
5. Active `CustomerInfo.entitlements["pro"]` opens the comparison. Otherwise the paywall loads RevenueCat's current Offering.

There is no local `isPro` flag, backend purchase route, REST secret, webhook, Google Play Billing configuration, or hardcoded price. CustomerInfo updates can revoke access when the accelerated Test Store subscription expires.

## Isolation

- Conversation remains usable when RevenueCat is unavailable.
- RevenueCat state cannot modify Router, Intent Lock, Policy, Graph, rewind, or Fork semantics.
- Android release builds receive an empty key and `REVENUECAT_ENABLED=false`.
- Purchases use anonymous RevenueCat App User IDs because the MVP has no login.
