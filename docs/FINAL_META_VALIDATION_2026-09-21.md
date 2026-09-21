# Final meta validation — 2026-09-21

Branch: `codex/shipaton-final-meta`
Initial baseline: `8fcd40795045e0bc2fc7c925e2d6717bae864a3f` (`origin/main`)
Target: RevenueCat Shipaton 2026 — Next Gen

## VERIFIED_NOW

### Official requirements

- Rechecked the current Devpost rules, dates, Next Gen page, official Test Store clarification, and RevenueCat Test Store documentation on 2026-09-21.
- The deadline remains 2026-09-30 at 11:45 PM PDT. Next Gen remains exempt from store release/download testing and requires the public repository, open-source license, public sub-two-minute demo, and active-student eligibility evidence already recorded for the submission.
- The rules state that Next Gen is judged on the video and open-source repository. Judges may inspect the repository for testing, but they are not required to install the app and may judge from the submitted description, images, and video.
- No new rule was found that invalidates the submitted Second Take path.

### Backend and security

- `npm ci`, `npm run build`, `npm test` (22/22), `npm run security:check`, and `npm run verify`: PASS.
- `npm run benchmark:local`: PASS after fixing creation of its output directory; 1,000 requests, p50 0.058 ms, p95 0.152 ms, max 2.788 ms, zero hangs in the baseline run.
- Vitest upgraded to 5.0.1 after the baseline audit identified two moderate dev-dependency advisories. Post-upgrade `npm audit`: 0 vulnerabilities.
- Gitleaks scanned 27 commits / approximately 1.09 MB: no leaks. Targeted tracked-file checks found no credential, private-key, `.env`, `local.properties`, keystore, ADC, or token material.

### Android and connected execution

- Committed wrapper: Gradle 8.13 on JDK 17.
- `assembleDebug`, `testDebugUnitTest` (30 tests), `lintDebug`, and `assembleRelease`: PASS.
- AVD `ScanFlow_API_34` / API 34 installed and ran the debug APK.
- Real Android-to-local-backend instrumentation: 2/2 tests, 42 turns, zero test failures or hangs. The 12-turn run recorded p50 5,860 ms / p95 9,334 ms / max 10,939 ms; the 30-turn run recorded p50 4,342 ms / p95 9,047 ms / max 10,023 ms.
- Controlled Compose flow: 9/9 tests covering Alex, Intent Lock, path A, exact rewind, path B, comparison, activity recreation, network retry, purchase cancellation/failure, restore, and the entitlement-backed comparison gate.
- Manual connected APK pass reached a provider-recovery state safely, retried with a new turn, produced a Turning Point, restored the exact checkpoint, showed the real Intent Lock options, completed path B, and kept Full A/B Comparison behind the paywall.
- Authenticated RevenueCat dashboard inspection verified the live Test Store app, active `default` offering, `$rc_monthly` package, `monthly` product, and active `pro` entitlement association.
- A targeted zero-cost Test Store run loaded the live offering, displayed RevenueCat's native `Test Store Purchase` dialog for `monthly` at the configured sandbox price, selected `TEST VALID PURCHASE`, returned `PurchaseResult.ProActivated`, and observed `AccessState.Pro`.
- The same opt-in `RevenueCatPurchaseSmokeTest` closed and relaunched the Activity, refreshed `CustomerInfo` as `Pro`, returned `RestoreResult.ProRestored`, and completed `connectedDebugAndroidTest` successfully. It is gated behind the explicit `runRevenueCatPurchase=true` instrumentation argument, so ordinary connected runs cannot create sandbox activity accidentally. The public SDK key was supplied ephemerally from the authenticated dashboard and was not printed, stored in a tracked file, or committed.
- Automated lint and visual/semantic inspection found no material accessibility blocker. Touch targets and content descriptions were present on the reviewed path. A human TalkBack audit was not performed.

### Vertex and model decision

- Existing Google Cloud ADC was already authorized. Calls used Vertex AI Global, API v1, with only a hash of the project identifier stored in evidence.
- The reproducible A/B used the same current router/selector prompts, low thinking level, structured schemas, deterministic policy, safe candidates, state, recent context, and retry/fallback logic for both models.
- Corrected evaluation corpus: 64 router observations per model (32 cases × 2) and 30 deterministic selector cases per model. Full evidence: [`evidence/model-ab-2026-09-21.json`](evidence/model-ab-2026-09-21.json).
- Gemini 3.7 Flash: router intent 82.8125%, ambiguity 79.6875%, Intent Lock 75%, schema valid 89.0625%, 7 failures; selector acceptable/preferred 86.6667%, zero invalid/unsafe selections, 5 fallbacks, 5 failures; estimated cost USD 0.154167.
- Gemini 3.8 Flash: router intent 82.8125%, ambiguity 76.5625%, Intent Lock 100%, schema valid 89.0625%, 7 failures; selector acceptable/preferred 100%, zero invalid/unsafe selections, 2 fallbacks, zero failures; estimated cost USD 0.143193.
- Both models had zero observed hidden-fact identifier leaks and zero selector-input state mutations. Neither produced an unsafe final selection.
- Decision: **KEEP `gemini-3.7-flash`**. Gemini 3.8 Flash delivered material selector/cost gains, but it was inferior on ambiguity accuracy and therefore failed the requested correction non-inferiority gate. Production defaults remain 3.7.

## HISTORICAL

- Devpost submission ID `1158646` was confirmed by email on 2026-08-29; the student checker was accepted during the live finalization flow.
- Public repository, MIT license, public video, icon, and required screenshot were previously confirmed. The demo is approximately 1:47.7.
- Submission-preparation evidence records a successful RevenueCat Test Store purchase, `CustomerInfo`, active `pro`, Full A/B unlock, restore, and relaunch recognition.
- An initial A/B trial was treated as exploratory after the evaluator's hidden-fact iterator and correction gate were found incomplete. Its outcome also retained 3.7 because 3.8 had an observed Intent Lock reliability regression. It is not the canonical metric artifact.

## NOT_VERIFIED

- Devpost management state and public YouTube playback were not modified or re-submitted during this pass.
- Human TalkBack traversal and human screen-reader comprehension.

## LIMITATIONS

- The public Test Store SDK key remains intentionally absent from tracked files and the release build. A fresh local checkout must provide it through ignored `android/local.properties` or an ephemeral Gradle project property before a real Test Store run.
- The verified purchase was a RevenueCat Test Store sandbox event. No card, real store, charged payment, real subscription, production revenue, or production entitlement was created.
- Vertex showed transient provider failures. The product stayed within bounded recovery/fallback behavior, but these results are a dated sample rather than a latency SLA.
- A final 20-turn `npm run smoke` at the production 10 s router deadline produced 19 typed transport recoveries and one 12 s client abort. An isolated 30 s router preflight immediately afterward succeeded in 25,793 ms with the expected intent, showing severe provider latency rather than an ADC/model-access failure. The earlier 42-turn connected run remained green; no current latency SLA is claimed.
- One polished Alex scenario, anonymous RevenueCat identity, local backend, Test Store, and no production release/backend remain intentional and disclosed.

## ADOPTED

- Keep Gemini 3.7 Flash as the production router and selector default.
- Add an evaluation-only model override so future A/B runs can use the exact production prompts/contracts without editing defaults.
- Add the reproducible model A/B harness and evidence artifact.
- Fix local benchmark output-directory creation.
- Upgrade Vitest to 5.0.1 to clear the current advisories.
- Suppress the duplicated offering-unavailable message while retaining the actionable inline paywall state.
- Refresh rules, current-status, claims, setup, and evidence boundaries, including the live RevenueCat revalidation.

## REJECTED

- Gemini 3.8 Flash migration: rejected because correction non-inferiority was not met.
- Live API, Interactions API, or agent-framework rewrite: out of scope and unnecessary.
- Free-form Gemini-authored Alex responses: rejected; authored responses and finite candidates remain invariant.
- Local/faked Pro unlock in production flow: rejected; Full A/B Comparison still depends on `CustomerInfo.entitlements["pro"].isActive`.
- Any claim of production users, revenue, charged purchase, store release, production backend, or scenarios not present in the repository: rejected.
