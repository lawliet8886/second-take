# v0.9 readiness report — historical snapshot

> **Historical pre-submission record.** This report captures readiness work performed before the Devpost finalization and is preserved for traceability. Statements such as `PENDING_JOIN` and `READY_FOR_FINAL_MEDIA_AND_SUBMISSION` are no longer current. Devpost confirmed the final Second Take submission on **2026-08-29**. See [`CURRENT_SUBMISSION_STATUS.md`](CURRENT_SUBMISSION_STATUS.md).

## Result at the time

**GREEN — student eligibility evidence was verified and no known eligibility blocker remained.** A private official declaration confirmed active enrollment, the academic address followed the official Estácio student-email format, and the institutional domain was present in JetBrains/swot with documented subdomain coverage.

## Verified locally in that pre-submission phase

- Candidate Android: clean build, lint, 30/30 JVM tests.
- Candidate backend: TypeScript build, 22/22 tests, internal secret scan.
- Fresh clone: backend verification and Android test/build both passed without committed credentials.
- Assets: icon 1024×1024; eight submission PNGs 1179×2556 with no device frame.
- Video sources: clean fork recording 61.90 s; RevenueCat recording 20.77 s; rough cut 83.17 s.
- Candidate current tree and one-commit history: no credential, personal-path, or selected PII pattern found.
- Frozen v0.8 evidence recorded 0 crashes and successful Test Store purchase, cancellation, failure, restore, relaunch, `CustomerInfo`, and Pro unlock.

These are recorded project-audit results from that phase; they are not a new independent reproduction performed on 2026-09-17.

## Instrumented recheck note

A 12-test emulator recheck was attempted. The functional run reached the RevenueCat/Comparison test, but the AVD returned a null screenshot bitmap inside evidence capture; the suite was then stopped after prolonged Test Store waits without local Test Store configuration. This was correctly recorded as an evidence-harness limitation, not a passing final smoke. No product crash was observed during that attempt.

## Eligibility status at that phase

- Active student: PASS — verified from private official evidence dated 2026-08-26.
- Academic institution: PASS — Universidade Estácio de Sá (UNESA).
- Academic email format: PASS — verified against official Estácio guidance.
- Domain evidence: PASS — `estacio.br` was documented in JetBrains/swot with subdomain coverage.
- Enrollment evidence: PASS — retained privately outside the public candidate.
- Devpost primary email: no change required according to the recorded official Shipaton manager response.
- Devpost student-email checker at this historical point: `PENDING_JOIN`.

## Superseding events

After this readiness snapshot:

1. the hackathon was joined;
2. the academic checker accepted the qualifying address;
3. the repository was published;
4. the final video was published;
5. the Devpost media/links were finalized; and
6. Devpost sent `Submission confirmed: Second Take` on 2026-08-29.

The current official rules were rechecked on 2026-09-17; see [`OFFICIAL_RULES_AUDIT.md`](OFFICIAL_RULES_AUDIT.md).