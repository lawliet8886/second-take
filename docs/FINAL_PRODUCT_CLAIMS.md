# Final product claims

## Demonstrated

- A working bilingual Android app connected to a local orchestration backend.
- Natural text conversation with Alex, one-tap Intent Lock, exact checkpoint rewind, a second branch, and Full A/B Comparison.
- A zero-cost 2026-09-21 RevenueCat Test Store run verified the live `default` offering, `$rc_monthly` / `monthly`, purchase, `CustomerInfo`, active `pro`, Activity relaunch recognition, and restore. Deterministic tests cover cancellation and failure handling. No charged production transaction is claimed.
- Safe local selector fallback, session isolation, idempotent turns, and backend-owned hidden facts.

## Architectural guarantees

- The policy offers only safe ResponsePlans from a finite 25-plan action graph.
- Gemini selects structured plan IDs from a safe candidate set; it does not author Alex's final message.
- Rewind restores the same pre-fork state; interpretation confirmation is branch metadata and does not rewrite the user's turn or facts.
- A selector failure can choose only a deterministic fallback from already-safe candidates. A router failure returns explicit recovery without inventing an intent or executing a plan.
- Application deadlines bound the caller's wait even if a provider ignores its timeout. Late completion cannot apply another state transition. This does not cancel the underlying remote request or guarantee provider availability.

## Interpretation and commercial limits

- The connected comparison displays the user's choice and Alex's immediate response in each branch. It is not a demonstrated multi-turn outcome forecast, relationship score or therapeutic assessment.
- The comparison-reading feature adds deterministic notes for 24 exact authored replies across three families (clarification, sources-by-nine capability, sources-by-nine offer), in English and Portuguese. Unknown replies receive no specific reading. Notes use only the displayed reply, not hidden facts or a new model call. The submitted V6 video captures them with real backend and Test Store access; see `VIDEO_V6_REVIEW.md`, `COMPARISON_READING_2026-09-21.md` and `PUBLICATION_V6_2026-09-21.md`. PR #5 is merged into main, which includes the submitted refinement.
- The monthly Test Store price is an experimental configuration. Recurring willingness to pay, retention, customer demand and revenue have not been validated.

## Roadmap, not current functionality

- More scenarios and production hosting.
- Store billing outside RevenueCat Test Store, accounts, cross-device persistence, voice, and an optional coaching layer.
