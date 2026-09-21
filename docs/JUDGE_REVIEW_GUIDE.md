# Reviewing Second Take

## See the product

Watch the [submitted 1:41 demo](https://www.youtube.com/watch?v=lKjPDNHgfNc). It shows the Alex rehearsal, preserved checkpoint, second choice, RevenueCat Test Store purchase and unlocked comparison. The demo is edited footage of an Android development build, with English captions. Editorial interpretation is outside the app capture, not an automated coaching feature. It does not claim production hosting or a real payment.

The core question is small and concrete: **what changes when I choose different words at the same conversational moment?** The comparison shows the user's wording and Alex's immediate response in each branch. It does not predict a real person's response or establish therapeutic effectiveness.

## Inspect the mechanism

- `backend/src/orchestration/turn-orchestrator.ts`: checkpoint restore, Intent Lock, finite safe selection, explicit router recovery, deterministic selector fallback and application deadlines.
- `android/app/src/main/java/com/secondtake/verticalslice/ui/ConnectedConversationViewModel.kt`: connected conversation and capture of the two visible branches.
- `android/app/src/main/java/com/secondtake/verticalslice/billing/RevenueCatEntitlementRepository.kt`: offering, purchase, CustomerInfo, active `pro` access and restore.

The invariant is a preserved pre-choice context, not a claim that language models predict human causality. Gemini interprets/selects; authored responses realize approved actions.

## Run without cloud credentials

From `backend/`, use Node.js 22+ and run `npm ci` then `npm run verify`. This executes the deterministic tests and secret checks. `npm run benchmark:local` uses a local fake provider, not Vertex; its timing is not AI inference latency.

From `android/`, use JDK 17 / Android SDK 35 and run `./gradlew assembleDebug testDebugUnitTest lintDebug assembleRelease` (PowerShell: `.\gradlew.bat`). These gates do not prove external-service availability.

## Optional live run

Follow the root README for a local Vertex backend and emulator connection. Your own authorized Google Cloud project is required; Vertex may charge according to that project's billing. Do not create charges just to inspect the submission. Provider-free tests and the video remain available.

RevenueCat testing uses a public **Test Store** SDK key, an offering `default`, package `$rc_monthly`, product `monthly` and entitlement `pro`; see [setup](REVENUECAT_TEST_STORE_SETUP.md). Do not use a secret REST key or production-store key. The opt-in connected smoke creates only a Test Store event. No judge needs access to the author's dashboard, Google credentials or personal account.

## Evidence and limits

See [dated validation](FINAL_META_VALIDATION_2026-09-21.md) and [current submission status](CURRENT_SUBMISSION_STATUS.md). The September 21 live provider sample includes severe latency failures; the subsequent application-deadline fix guarantees bounded recovery in controlled tests, not a Vertex latency SLA.

The single Alex scenario establishes a working loop. The monthly sandbox price and recurring subscription demand are not market-validated. Additional scenarios and production deployment are roadmap items.
