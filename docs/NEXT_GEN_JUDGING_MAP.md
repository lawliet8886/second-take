# Next Gen judging map

**Refreshed: 2026-09-17**

This map uses the current official Next Gen criteria and separates **demonstrated/recorded evidence** from **static code evidence**. Historical execution results are not presented as a fresh 2026-09-17 independent reproduction.

| Official criterion | Submitted video / recorded evidence | README / Devpost story | Static code evidence | Main limitation / confidence note |
|---|---|---|---|---|
| Clear, useful, interesting, or original idea; compelling experience / real problem | Same checkpoint → first choice → rewind → different choice → different consequence | Conversation Fork explains why ordinary chatbots are a weak A/B comparison | Fork snapshot + branch-specific state/comparison paths exist | One polished scenario, so breadth is intentionally limited |
| Meaningful progress toward a working app; core functionality clear in video and repo | Recorded Android flow includes conversation, Intent Lock, rewind, branch B, RevenueCat unlock, comparison | Demonstrated claims and setup are public | Compose client, Fastify backend, tests, real router/selector clients, rewind/idempotency logic | Prior build/test results are recorded evidence; clean-room rerun of the hardening branch is still pending |
| Thoughtful RevenueCat use for monetization | Paywall appears only after both paths demonstrate the value; Test Store purchase activates Pro | Monetization rationale is explicit and Test Store is disclosed | RevenueCat SDK offering/purchase/restore, `CustomerInfo`, active `pro` entitlement gate | Test Store, not a production charged transaction; explicitly allowed for Next Gen |
| Thoughtful technical choices, product thinking, and care | Architecture segment explains bounded Gemini and local fallback | Safety-by-construction story, limitations, privacy, roadmap boundaries | finite safe candidate set, Intent Lock, structured Gemini outputs, deterministic fallback, hidden-state boundary, idempotency | No production backend/store release; full human TalkBack audit remains future work |

## Evidence confidence

- **Strong static support:** product architecture, RevenueCat entitlement implementation, safe-candidate/fallback boundary, branch/rewind source, public assets.
- **Recorded runtime support:** submitted Android/video behavior, historical build/test results, Test Store lifecycle evidence.
- **Pending independent verification:** fresh-clone build/test/lint of the 2026-09-17 hardening branch and external-service smoke where credentials/services are available.

## Claim discipline

No judging argument should depend on invented users, revenue, production adoption, store availability, therapeutic outcomes, or roadmap features. The strongest submission story is the narrow one the code actually supports: **controlled causal rehearsal + an entitlement gate placed after the user experiences the core value**.