# Current submission status

**Last verified: 2026-09-17**

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
- Demo video: https://www.youtube.com/watch?v=KMOa5bSV1Eo
- Demo duration: approximately **1:47.7**
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

On 2026-09-17, the public repository was re-audited for Shipaton Next Gen alignment. The hardening branch addresses stale submission-status documentation, broken setup references, cross-platform backend configuration fallback, and reproducibility wording. The core product architecture and submitted claims remain substantively unchanged.

Historical documents should be read in their dated context. In particular, any older `NOT_SUBMITTED`, `PENDING_JOIN`, `READY_PENDING_PUBLIC_URLS`, or similar labels describe states before the confirmed 2026-08-29 submission.