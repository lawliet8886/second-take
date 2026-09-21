# Shipaton submission checklist

Current-status audit refreshed on **2026-09-21**. Official rules were rechecked against the current RevenueCat Shipaton 2026 Devpost rules, schedule, FAQ, and the official Next Gen/Test Store clarification.

| Requirement | Status | Evidence / note |
|---|---|---|
| Joined hackathon | PASS | Live Devpost flow was joined before submission |
| Next Gen category | PASS | Next Gen academic-email/repository fields were present and used |
| Active student | PASS | Private enrollment evidence retained outside the public repository |
| Academic email checker | PASS_FINAL | Saved by Devpost without validation error during finalization |
| Public open-source repo | PASS | https://github.com/lawliet8886/second-take |
| Detectable open-source license | PASS | Root `LICENSE` is MIT; GitHub detects the repository license as MIT |
| Source/assets/setup instructions | PASS_WITH_HARDENING | Present; this audit corrects stale/broken setup paths before merge |
| Final English video under 2 min | PASS | 107.7 s approved master |
| Public YouTube/Vimeo URL | PASS | https://www.youtube.com/watch?v=KMOa5bSV1Eo |
| Device/platform footage | PASS_RECORDED | Prior video QA records the Android flow, fork, Intent Lock, RevenueCat flow, and comparison |
| Android app icon | PASS | `assets/app-icon.png`, 1024×1024 |
| Required screenshot | PASS | `assets/screenshots/required-1179x2556.png`, 1179×2556, no device frame |
| RevenueCat integration | PASS_RECORDED_NOT_REVERIFIED_NOW | Submission evidence records Test Store purchase → `CustomerInfo` → `pro` entitlement → Full A/B Comparison; the 2026-09-21 checkout had no Test Store SDK key, so the live sequence could not be rerun |
| Test Store allowed for Next Gen | PASS | Explicitly confirmed by a Shipaton manager in the official Devpost discussion |
| No false store-release claim | PASS | Next Gen does not require a store release; none is claimed |
| Devpost story and public links | PASS_RECORDED | Final public URLs were saved before submission |
| Final Devpost submission | PASS_CONFIRMED | Devpost email received 2026-08-29: `Submission confirmed: Second Take` |
| Private academic evidence excluded from repo | PASS | No academic address/document is intentionally published |

## Current competition state

- Submission period closes **2026-09-30 at 11:45 PM PDT**.
- Judging runs after the submission period; winners are scheduled for **2026-10-21**.
- Current official rules freeze submission changes after the Submission Period ends, except limited organizer-permitted corrections.
- This repository hardening work is being prepared on a review branch before that deadline.

## Current limitations that must remain explicit

- One polished Alex scenario.
- Local backend; no production backend deployment.
- RevenueCat **Test Store**, not a charged production-store transaction.
- Anonymous RevenueCat user identity; no account system.
- Release build intentionally contains no Test Store key and no production backend endpoint.
- Full human TalkBack accessibility audit remains future work.

Status: `SUBMITTED_AND_UNDER_PRE_DEADLINE_HARDENING`.
