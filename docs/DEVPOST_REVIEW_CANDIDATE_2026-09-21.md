# Devpost revision — published September 21, 2026

Published to the existing Second Take entry after explicit owner approval. The filename is retained for traceability. See `PUBLICATION_RECEIPT_2026-09-21.md` for verification.

## Tagline

One conversation. A second choice. See what changes.

## Inspiration

Your teammate's slides are late. The presentation is Friday. You need to say something, but how do you start?

Second Take gives that moment a second attempt. Instead of starting a new roleplay with potentially different facts, you rewind to a preserved checkpoint and change your choice. The point is to inspect a concrete difference, not to predict how a real person will behave.

## What it does

In the recorded Alex rehearsal, “I am worried about the project” gets “What do you mean exactly?” After a rewind, “Can you finish today?” leads to “I can finish the sources by nine tonight.” The comparison puts those choices and immediate responses together.

The useful detail is the limit of that offer: sources by nine, not the whole project. Reading both responses side by side helps distinguish an unresolved concern from a specific next step. This is an interpretation of the recorded example, not an automated coaching score or proof that one phrasing always works better.

Intent Lock lets the user confirm whether an ambiguous message asks about ability or requests action. The conversation, rewind and second attempt are free. RevenueCat gates Full A/B Comparison after both attempts, when the user has a reason to review what changed.

## How we built it

Kotlin and Jetpack Compose provide the Android interface. A TypeScript/Fastify backend owns state and checkpoints. Gemini 3.7 Flash interprets text and selects only among policy-approved actions. Alex's final replies are authored, not freely generated.

A selector failure can use a deterministic safe candidate. A router failure returns a clear interruption rather than inventing the user's intention. Application deadlines bound the wait; they do not make an unavailable provider available.

RevenueCat Test Store provides the offering, purchase, CustomerInfo update, active `pro` entitlement, restore and relaunch recognition. No real charge is claimed, and there is no local premium bypass.

## What we learned

A controlled second attempt requires more than a new chatbot answer: it needs preserved context, explicit user intent and consistent state transitions. We also learned to distinguish passing local tests from reliable cloud service. A late provider sample exposed latency failures, so we added application-level deadlines and tested late responses for unwanted state changes.

## Monetization and next steps

The hypothesis is that an organized comparison is valuable after a free rehearsal. The current monthly Test Store price is experimental; one scenario does not establish recurring willingness to pay. We have not validated demand, retention or revenue.

The next product questions are whether people understand the difference between their attempts and whether they return for another rehearsal. More authored scenarios, production hosting, store billing and deeper accessibility validation remain future work.

## Links

- Code: https://github.com/lawliet8886/second-take
- Current submitted video: https://www.youtube.com/watch?v=lKjPDNHgfNc
- Public entry: https://devpost.com/software/second-take-kxgcdq
