# Next Gen judging map

**Refreshed: 2026-09-21**

This map uses the official Next Gen criteria checked on September 21 and separates recorded demonstration, current runtime checks and static implementation evidence. V4 and revised Devpost copy remain unpublished review candidates.

| Official criterion | Submitted video / recorded evidence | README / Devpost story | Static code evidence | Main limitation / confidence note |
|---|---|---|---|---|
| Clear, useful, interesting, or original idea; compelling experience / real problem | Same checkpoint → first choice → rewind → different choice → different consequence | Conversation Fork explains why ordinary chatbots are a weak A/B comparison | Fork snapshot + branch-specific state/comparison paths exist | One polished scenario, so breadth is intentionally limited |
| Meaningful progress toward a working app; core functionality clear in video and repo | Recorded flow includes conversation, Intent Lock, rewind, branch B, RevenueCat unlock and comparison; 9/9 controlled connected tests passed again | Reviewer guide and provider-free setup give a short inspection path | Compose client, Fastify backend, tests, real router/selector clients, rewind/idempotency logic | Clean-room gates passed September 18; current build/test gates pass. Latest live provider sample still has 5 router recoveries / 20 turns |
| Thoughtful RevenueCat use for monetization | Paywall appears after both paths; live Test Store purchase, Pro, relaunch and restore verified September 21 | Comparison value and Test Store are explicit; recurring demand and price are unvalidated hypotheses | RevenueCat SDK offering/purchase/restore, `CustomerInfo`, active `pro` entitlement gate | Test Store only; no production charge or validated willingness to pay |
| Thoughtful technical choices, product thinking, and care | Architecture segment explains bounded Gemini and local fallback | Safety-by-construction story, limitations, privacy, roadmap boundaries | finite safe candidate set, Intent Lock, structured Gemini outputs, deterministic fallback, hidden-state boundary, idempotency | No production backend/store release; full human TalkBack audit remains future work |

## Evidence confidence

- **Strong static support:** product architecture, RevenueCat entitlement implementation, safe-candidate/fallback boundary, branch/rewind source, public assets.
- **Recorded runtime support:** submitted Android/video behavior, historical build/test results, Test Store lifecycle evidence.
- **Current verification:** September 18 clean-room and September 21 backend/Android gates are recorded in `CURRENT_SUBMISSION_STATUS.md`; September 21 also verified live RevenueCat Test Store. The candidacy follow-up has 24 backend tests and 9 controlled connected tests passing.
- **Current risk:** the last September 21 provider sample had severe latency failures. Application deadlines now cover stalled router/selector calls in controlled tests; live availability is not inferred from those tests.
- **Presentation review:** revised copy and V4 are review candidates, not claims that the public entry has already changed. Historical numeric editorial scores are internal opinions, not independent judge ratings.

## Claim discipline

No judging argument should depend on invented users, revenue, production adoption, store availability, therapeutic outcomes, or roadmap features. The strongest submission story is the narrow one the code actually supports: **controlled causal rehearsal + an entitlement gate placed after the user experiences the core value**.
