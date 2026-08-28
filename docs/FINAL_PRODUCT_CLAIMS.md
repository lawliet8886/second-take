# Final product claims

## Demonstrated

- A working bilingual Android app connected to a local orchestration backend.
- Natural text conversation with Alex, one-tap Intent Lock, exact checkpoint rewind, a second branch, and Full A/B Comparison.
- RevenueCat Test Store purchase, `CustomerInfo`, entitlement `pro`, restore, relaunch recognition, cancellation, and failure handling.
- Safe local selector fallback, session isolation, idempotent turns, and backend-owned hidden facts.

## Architectural guarantees

- The policy offers only safe ResponsePlans from a finite 25-plan action graph.
- Gemini selects structured plan IDs from a safe candidate set; it does not author Alex's final message.
- Rewind restores the same pre-fork state; interpretation confirmation is branch metadata and does not rewrite the user's turn or facts.
- Provider failure can only choose a deterministic fallback from already-safe candidates.

## Roadmap, not current functionality

- More scenarios and production hosting.
- Store billing outside RevenueCat Test Store, accounts, cross-device persistence, voice, and an optional coaching layer.

