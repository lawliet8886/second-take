# Second Take

**Rehearse, rewind, and compare.**

Second Take is an Android conversation-rehearsal app for moments that matter because real life rarely gives us a clean second attempt. Talk naturally to Alex, rewind to the exact same conversational checkpoint, make a different choice, and compare how the two paths changed.

![Second Take comparison](assets/screenshots/06-comparison.png)

## Why it is different

This is not a generic advice chatbot. A **Conversation Fork** preserves the same facts, personality, history, and pre-state across two branches. Only the user's choice changes. The resulting consequences can therefore be compared instead of improvised after the fact.

The free path includes the scenario, natural conversation, Intent Lock where required, one rewind, and the second attempt. RevenueCat unlocks the premium Full A/B Comparison only after the user has experienced both paths.

## How it works

![Architecture](assets/diagrams/architecture.svg)

Gemini 3.7 Flash interprets language and selects among conversation moves already approved by a deterministic policy and finite action graph. Gemini never freely writes Alex's final response. Authored utterances realize the selected safe plan, while a deterministic local fallback keeps the rehearsal moving during provider failures.

Intent Lock gives the user one-tap control over the critical distinction between asking whether Alex *can* do something and asking Alex *to* do it.

## RevenueCat

![RevenueCat flow](assets/diagrams/revenuecat-flow.svg)

The Android client uses RevenueCat Android SDK 10.19.1 and the RevenueCat Test Store. Offering `default` exposes package `$rc_monthly`; access is granted only from `CustomerInfo.entitlements["pro"].isActive`. No purchase state is faked locally. The Shipaton Next Gen build transparently discloses that it uses Test Store, not a real charged transaction.

## Stack

- Android: Kotlin, Jetpack Compose, Material 3, OkHttp, RevenueCat Android SDK
- Backend: TypeScript, Fastify, Zod, Vitest, Google Gen AI SDK
- AI: Gemini 3.7 Flash through Vertex AI Global, structured output, finite safe candidates

## Run locally

### Provider-free checks

```powershell
cd backend
npm ci
npm test

cd ..\android
.\gradlew.bat testDebugUnitTest
```

These test paths use fakes and do not require Google Cloud or RevenueCat credentials.

### Backend with Vertex

Requirements: Node.js 22+, Google Cloud CLI, your own project with Vertex AI enabled.

```powershell
gcloud auth application-default login
$env:VERTEX_PROJECT_ID = "your-project-id"
cd backend
npm ci
npm run verify
npm start
```

The local service binds to `127.0.0.1:8765`. ADC, OAuth tokens, and credential JSON never belong in this repository.

### Android

Use JDK 17 and Android SDK 35. The emulator reaches the host backend at `http://10.0.2.2:8765`; a physical device can use `adb reverse tcp:8765 tcp:8765`.

```powershell
cd android
.\gradlew.bat assembleDebug testDebugUnitTest lintDebug
```

Optional values belong only in untracked `android/local.properties`:

```properties
SECOND_TAKE_BACKEND_URL=http://10.0.2.2:8765
REVENUECAT_TEST_STORE_API_KEY=test_your_public_sdk_key
```

Configure one RevenueCat Test Store monthly product (`monthly`), entitlement `pro`, offering `default`, and package `$rc_monthly`. Release builds disable Test Store configuration.

## Project map

- `android/` — Compose client, tests, and RevenueCat entitlement layer
- `backend/` — local orchestration, graph/policy, resilience, and fake-provider tests
- `docs/` — architecture, data flow, claims, judging and submission material
- `assets/` — curated diagrams, screenshots, and source recordings

## Privacy and safety

The backend is the conversation authority and keeps hidden facts server-side. The Android client receives only visible state. Operational logs are sanitized by default. See [Privacy and data flow](docs/PRIVACY_AND_DATA_FLOW.md) and [AI architecture](docs/AI_ARCHITECTURE.md).

## Current limits

The MVP contains one polished Alex scenario, uses a local backend, relies on an anonymous RevenueCat user, and uses Test Store rather than a real app-store purchase. Provider outages can activate a safe local fallback. A full human TalkBack audit remains future work.

## Roadmap

See [Post-Shipaton roadmap](docs/POST_SHIPATON_ROADMAP.md). Roadmap items are not presented as current features.

## License

MIT. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
