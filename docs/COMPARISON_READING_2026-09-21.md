# Comparison reading — implementation checkpoint

## Scope

Base: `af1879717f21e648d0e6d1d7bbdcbf8edebe799f`.
Branch: `codex/comparison-evidence`.
The published V5 and submitted main baseline remain unchanged during review.

The competitive audit identified a gap between the editorial explanation in V5
and the actual comparison UI. This change brings a narrowly bounded reading of
visible responses into the Pro comparison. It is not free-form coaching,
sentiment analysis, a conversation score, or a prediction about real people.

## Checklist

- [x] Inspect current source and preserve the local competitive audit.
- [x] Baseline Android unit task successful (up-to-date); backend verify: 24 tests.
- [x] Add exact visible-reply allowlist and neutral unknown-reply fallback.
- [x] Separate ability statements from offers; do not infer whole-project delivery.
- [x] Add English and Brazilian Portuguese UI copy with larger response text.
- [x] Require current Pro state when rendering comparison, including after revocation.
- [x] Validate catalog coverage, adversarial mutations and deterministic behavior.
- [x] Run Android build, unit, lint, release and connected UI checks.
- [x] Review final diff and update claims for delivery through a review PR.

## Safety contract

`observeReply` accepts only the visible Alex reply string. Exact catalog matches
may identify clarification, sources-by-nine capability, or a sources-by-nine
offer. It does not receive hidden facts, state variables, user intent, user text,
branch identity, or provider metadata. Unknown or modified text gets no specific
interpretation. Catalog-wide tests detect drift and unintended classification.

All notes remain inside Full A/B Comparison and its real RevenueCat `pro` gate.
No backend policy, state restoration, Intent Lock, candidates, authored responses,
model configuration, credentials, billing settings or public submission is changed.

## Validation status

Final Android rerun passed: **34 unit tests and 13 connected tests, zero failures,
errors or skips**, plus `assembleDebug`, `lintDebug` and `assembleRelease`.
Lint reports zero errors and 21 warnings; no warning-free claim is made.
Backend `npm run verify` passed again: 24 tests,
TypeScript build, and secret-pattern scan over 171 backend files. A separate scan
of staged changes found no credential patterns or staged local credential files.

The first connected run completed 13 tests: 11 passed and 2 failed visibility
assertions on transient screens (the Back dialog and the existing rewind test).
The tests now explicitly synchronize with the dialog and hold the fake rewind
operation until the rewind screen is observed. Assertions remain in place. The
three comparison component tests, including 320 dp / 2x font scale, passed on that
first run; the final rerun also requires screenshot capture instead of silently
accepting an unavailable system screenshot.

All four component screenshots were captured and visually inspected, including
English, Portuguese and doubled font scale. They are synthetic test fixtures,
not new footage of a live backend or RevenueCat transaction. Local output:
`android/app/build/comparison-reading-fixtures/`. Frames show different scroll
positions; the tests verify that notes and the return button remain reachable.

Reproduction from `android/` (PowerShell):

```powershell
./gradlew.bat testDebugUnitTest assembleDebug lintDebug assembleRelease connectedDebugAndroidTest --max-workers=2 '-Pandroid.testInstrumentationRunnerArguments.class=com.secondtake.verticalslice.ConversationForkFlowTest,com.secondtake.verticalslice.ComparisonReadingTest'
```

Connected device used: `ScanFlow_API_34`, Android 14 emulator. The initial failures
are retained in this record; the final run completed successfully after explicit
test synchronization, with the original visibility assertions still enforced.

Instrumented tests use explicit fakes; they do not establish
fresh Vertex or real RevenueCat purchase validation. The release configuration
remains intentionally disabled for production backend/billing.

Static contrast calculation for the new card text on `#111426`: Ink 17.14:1,
Muted 8.08:1, Coral 8.26:1, Mint 12.10:1. This is a palette check, not a full
accessibility certification or a screen-reader test.

## Limitations

Only three authored reply families receive a specific reading. Other responses
remain inspectable verbatim with a neutral reflection prompt. The comparison
still covers the first immediate response in each branch, not long-term outcomes.
No new scenario, recurring-value evidence, pricing validation, independent human
comprehension test or winning probability is claimed. V5 does not show this new UI.

## Review and delivery boundary

A separate read-only code review checked catalog correspondence, visible-data
isolation and the entitlement flow. Its navigation finding was fixed: losing Pro
now clears the open-comparison state, and reactivation does not reopen it by itself.
The connected test covers revocation, Back navigation, reactivation and the paywall.

The local competitive audit is preserved outside this change's staged files.
No competitor media, generated build output, credential file or temporary cache is
included. No merge, new video publication, Devpost edit or charged purchase was made.

## V6 live-capture follow-up

The subsequent V6 review candidate now shows these notes in the real connected
app, not the four fixture screenshots described above. The separate opt-in
`RealDemoCaptureTest` passed one complete flow with repository overrides absent,
the real backend, Intent Lock, rewind and a real zero-cost Test Store purchase.
Refreshed `CustomerInfo` was asserted to contain active `pro` before capturing
the comparison. Source footage, failed-attempt disclosure, hashes, media checks
and reproduction are in [VIDEO_V6_REVIEW.md](VIDEO_V6_REVIEW.md). Following owner
approval, V6 replaced V5 on the existing Devpost submission; see
[publication receipt](PUBLICATION_V6_2026-09-21.md). Earlier publication-status
statements in this implementation record describe the pre-approval checkpoint.
