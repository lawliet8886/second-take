# Current submission status

**Last verified: 2026-09-21**

This file is the canonical current-status record for Second Take. Older readiness and form-audit documents are preserved as historical snapshots and may describe pre-submission states.

## Competition

- Event: **RevenueCat Shipaton 2026**
- Target award: **Next Gen**
- Submission deadline: **2026-09-30 at 11:45 PM PDT**
- Judging period: **2026-10-01 through 2026-10-13**
- Winners scheduled: **2026-10-21**
- Official rules: https://revenuecat-shipaton-2026.devpost.com/rules

## Submission receipt

- Project: **Second Take**
- Devpost submission ID: `1158646`
- Final submission: **CONFIRMED**
- Confirmation source: Devpost email received on **2026-08-29**, subject `Submission confirmed: Second Take`
- Student checker: **accepted during the live finalization flow**
- App platform: Android
- Store release: **not claimed; not required for Next Gen**

No private academic email address or enrollment document is reproduced here.

## Public judging surfaces

- Repository: https://github.com/lawliet8886/second-take
- Devpost entry: https://devpost.com/software/second-take-kxgcdq
- Demo video: https://www.youtube.com/watch?v=lKjPDNHgfNc
- Demo duration: approximately **1:41.45** (V5)
- Devpost readback on September 21: **Submitted — 5/5 steps done**, updated video URL, revised story and tagline saved; no duplicate submission or new terms acceptance.
- License: MIT

## Product claim boundary

Second Take is a development/demo Android app for rehearsing a difficult conversation, rewinding to the same conversational checkpoint, trying a different response, and comparing the resulting branches.

The submitted build demonstrates:

- natural text conversation with Alex;
- Intent Lock for one high-impact ambiguity;
- an exact pre-turn Conversation Fork snapshot and rewind;
- branch-specific consequences and Full A/B Comparison;
- Gemini 3.7 Flash used for bounded semantic routing/plan selection;
- deterministic policy/finite action graph boundaries;
- deterministic local fallback from already-safe candidate plans;
- RevenueCat Test Store offering, purchase handling, `CustomerInfo`, `pro` entitlement, restore/relaunch behavior, and entitlement-backed Full A/B Comparison.

It does **not** claim:

- production app-store distribution;
- a production payment transaction;
- production backend hosting;
- multiple polished scenarios;
- unrestricted generative dialogue;
- a completed human TalkBack accessibility audit.

## Current audit note

The September 21 owner-approved publication replaced the submitted video with V5 (1:41), updated the existing Devpost story/tagline and judge instructions, and retained the original video as an archive. See `PUBLICATION_RECEIPT_2026-09-21.md` for exact publication and GitHub evidence. V4 is an archived alternative, not the current submission. An application-level deadline bounds stalled provider waits. The latest live smoke had 5 router recoveries in 20 turns and no client aborts, so service availability remains a limitation.

On 2026-09-17, the public repository was re-audited for Shipaton Next Gen alignment. The hardening branch addresses stale submission-status documentation, broken setup references, cross-platform backend configuration fallback, and reproducibility wording. The core product architecture and submitted claims remain substantively unchanged.

On 2026-09-18, independent clean-room verification passed the provider-free backend gates (`npm ci`, build, tests, security check, `verify`) and the committed-wrapper Android gates (`./gradlew --version`, `assembleDebug`, `testDebugUnitTest`, `lintDebug`, `assembleRelease`) with Gradle 8.13. `@google/genai` is pinned consistently to `2.19.0` in the manifest and lockfile. External credentialed runtime checks remain separately classified.

On 2026-09-21, the complete provider-free gates passed again; Vertex ADC and connected Android-to-backend execution were verified; and a controlled Gemini 3.7 Flash versus 3.8 Flash evaluation retained 3.7 because 3.8 was not non-inferior on ambiguity accuracy. The authenticated RevenueCat dashboard was then revalidated and a zero-cost Test Store run verified `default` / `$rc_monthly` / `monthly`, `CustomerInfo`, active `pro`, Activity relaunch, and restore. The public SDK key remained outside tracked files. See [`FINAL_META_VALIDATION_2026-09-21.md`](FINAL_META_VALIDATION_2026-09-21.md).

Historical documents should be read in their dated context. In particular, any older `NOT_SUBMITTED`, `PENDING_JOIN`, `READY_PENDING_PUBLIC_URLS`, or similar labels describe states before the confirmed 2026-08-29 submission.
