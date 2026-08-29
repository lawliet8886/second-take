# Devpost submission draft

## Project name

Second Take

## Tagline

Rehearse, rewind, and compare.

## Short description

Second Take lets people rehearse a difficult conversation, rewind to the exact same moment, try a different response, and compare the consequences.

## Inspiration

Difficult conversations matter precisely because we often get only one real attempt. Generic chatbots can simulate dialogue, but asking them for a “second take” may silently change facts, tone, or history. We wanted a rehearsal space where the moment itself stays fixed and only the user's choice changes.

## What it does

The user talks naturally with Alex, a teammate in an unfinished-project scenario. When a capability question could instead be a request, Intent Lock gives the user one-tap control over the intended move. At a Turning Point, Second Take records an exact checkpoint. The user completes a first path, rewinds, returns to the same facts and conversational state, and tries a second response. Full A/B Comparison shows how the two choices produced different consequences.

The complete fork experience is free. After both paths have demonstrated the value, RevenueCat unlocks Full A/B Comparison through a real Test Store offering, purchase, CustomerInfo update, and `pro` entitlement.

## How we built it

The Android client uses Kotlin, Jetpack Compose, Material 3, OkHttp, and RevenueCat Android SDK 10.19.1. A local TypeScript/Fastify backend owns conversation state, hidden facts, checkpoints, and branches.

Gemini 3.7 Flash interprets free text and selects among conversation actions already approved by a deterministic policy and a finite 25-plan graph. It never writes Alex's final message freely. A local graph transition and authored utterance realize the plan. A circuit breaker, bounded deadline, idempotency, and deterministic local safe fallback keep turns recoverable.

RevenueCat Test Store provides offering `default`, package `$rc_monthly`, purchase handling, restore, and CustomerInfo. Full Comparison opens only when entitlement `pro` is active.

## Challenges we ran into

Fully generative conversations felt natural but could invent pragmatic implications and made exact rewinds unreliable. Ambiguity detection also could not safely guess every mixed human intention. Finally, model serving produced long operational tails even when semantic quality was strong.

We responded with product and engineering boundaries: a finite safe graph, user-controlled Intent Lock for one critical distinction, and a local fallback that can choose only an already-safe candidate.

## Accomplishments that we're proud of

- An exact Conversation Fork with immutable pre-fork context.
- A working bilingual Android-to-backend flow with no known hidden-fact leaks.
- Safe-by-construction plan selection and deterministic outage recovery.
- A meaningful RevenueCat gate that appears after the user experiences the core value.
- Real Test Store purchase, cancellation, failure, restore, relaunch, and entitlement-driven unlock.

## What we learned

The best use of an LLM was not to own the entire conversation. Separating understanding, allowed action, and authored realization made the experience safer, testable, and rewindable. We also learned that explicit user control can be better product design than pretending the system can infer every important intention.

## What's next for Second Take

After the Shipaton build: production hosting, more authored scenarios, account-based sync, app-store billing, deeper accessibility validation, and carefully scoped reflection tools. These are roadmap items, not current submission claims.

## RevenueCat use

The free experience lets users discover the Conversation Fork before monetization. RevenueCat appears at the natural next question: “What exactly changed between my two attempts?” Test Store is used because this is a Next Gen submission; no real payment is claimed.

## Public links

- Public repository: https://github.com/lawliet8886/second-take
- Public video (YouTube, under 2 minutes): https://www.youtube.com/watch?v=KMOa5bSV1Eo
