# v0.9 readiness report

## Result

**GREEN — student eligibility evidence is verified and no known eligibility blocker remains.** A private official declaration confirms active enrollment, the academic address follows the official Estácio student-email format, and the institutional domain is present in JetBrains/swot with documented subdomain coverage. The Devpost checker remains pending until the user joins the hackathon; this is a normal administrative step, not evidence of ineligibility.

## Verified locally

- Candidate Android: clean build, lint, 30/30 JVM tests.
- Candidate backend: TypeScript build, 22/22 tests, internal secret scan.
- Fresh clone: backend verification and Android test/build both pass without committed credentials.
- Assets: icon 1024×1024; eight submission PNGs 1179×2556 with no device frame.
- Video sources: clean fork recording 61.90 s; RevenueCat recording 20.77 s; rough cut 83.17 s.
- Candidate current tree and one-commit history: no credential, personal-path, or selected PII pattern found.
- Frozen v0.8 evidence explicitly records 0 crashes and successful Test Store purchase, cancellation, failure, restore, relaunch, CustomerInfo, and Pro unlock.

## Instrumented recheck note

A 12-test emulator recheck was attempted. The functional run reached the RevenueCat/Comparison test, but the AVD returned a null screenshot bitmap inside evidence capture; the suite was then stopped after prolonged Test Store waits without local Test Store configuration. This is recorded as an evidence-harness limitation, not a passing final smoke. No product crash was observed.

## Corrected eligibility status

- Active student: PASS — verified from private official evidence dated 2026-08-26.
- Academic institution: PASS — Universidade Estácio de Sá (UNESA).
- Academic email format: PASS — verified against official Estácio guidance.
- Domain evidence: PASS — `estacio.br` is registered to UNESA in JetBrains/swot and its documented matching includes subdomains.
- Enrollment evidence: PASS — retained privately outside the public candidate.
- Devpost primary email: no change required according to the official Shipaton manager response.
- Devpost student-email checker: PENDING_JOIN; no rejection was observed.
- Known eligibility blocker: NONE.

## Corrected submission readiness

**86% — READY_FOR_FINAL_MEDIA_AND_SUBMISSION.** Product, candidate repository, technical evidence, student eligibility, and submission assets are prepared. The remaining work consists of normal Join, media publication, form inspection, and final human review steps.

## Remaining normal submission actions

1. Join the hackathon and select Next Gen.
2. Enter the private student email in the submission field and record the checker result.
3. Inspect every now-visible Devpost field without making a false store-release declaration.
4. Review and publish the clean repository candidate.
5. Produce/review the narrated and captioned final video, then upload it publicly.
6. Attach final assets and submit only after a human review.
