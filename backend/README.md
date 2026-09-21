# Second Take Local Backend v0.6

Local-only Fastify service that orchestrates the frozen Second Take semantic stack. It binds to `127.0.0.1`, keeps scenario state and hidden facts server-side, and uses Vertex AI Global through Google Cloud Application Default Credentials (ADC).

## Requirements

- Node.js 22+
- Google Cloud CLI with Application Default Credentials for real Vertex calls
- A Google Cloud project with Vertex AI enabled

Provider-free build/tests do **not** require Google Cloud credentials.

## Provider-free verification

```powershell
npm ci
npm run verify
```

`npm run verify` performs the TypeScript check, fake-provider/domain tests, and the repository security check. It does not make a Vertex request.

## Local setup with Vertex

PowerShell:

```powershell
gcloud auth application-default login
$env:VERTEX_PROJECT_ID = "your-project-id"
npm ci
npm run verify
npm start
```

macOS/Linux shell:

```bash
gcloud auth application-default login
export VERTEX_PROJECT_ID="your-project-id"
npm ci
npm run verify
npm start
```

Optional configuration is listed in `.env.example`. ADC files, OAuth tokens, API keys, and credential JSON must never be copied into this repository.

The default address is `http://127.0.0.1:8765`. Check `GET /health` and `GET /ready`; neither endpoint calls Vertex.

## Sample requests

```powershell
$session = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8765/v1/sessions -ContentType application/json -Body '{"locale":"pt-BR"}'
$turn = @{ text = "O que aconteceu?"; clientTurnId = [guid]::NewGuid().ToString() } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8765/v1/sessions/$($session.sessionId)/turns" -ContentType application/json -Body $turn
```

If a turn returns `INTENT_LOCK_REQUIRED`, send the returned `turnId` and either `ASK_CAPABILITY` or `REQUEST_COMPLETION` to `/v1/sessions/{id}/intent-lock`. The choice is interpretation metadata, not a new chat message.

## Commands

- `npm run dev` — local watch mode
- `npm start` — start the local server
- `npm run build` — TypeScript check
- `npm test` — fake-provider and domain tests
- `npm run verify` — build, tests, and security check
- `npm run benchmark:local` — provider-free overhead benchmark
- `npm run smoke` — controlled real Vertex smoke; incurs usage
- `npm run benchmark:model-ab` — reproducible Gemini 3.7/3.8 Vertex comparison; incurs usage and writes the dated evidence artifact

The model A/B command keeps production defaults unchanged. It uses the same frozen prompts, schemas, policy, candidates, state shape, retry behavior, and deterministic fallback for both models. The migration gate requires non-inferior safety and correction plus a material gain; see `../docs/FINAL_META_VALIDATION_2026-09-21.md` for the dated decision.

## Scope

Runtime waits have an application deadline in addition to the SDK timeout. A router timeout produces typed recovery; a selector timeout uses a safe local candidate. Late provider completion cannot advance state twice. This bounds caller wait, not provider billing or service availability. The Android call timeout remains 15 seconds, above the default 10-second backend budget.

This backend has no public deployment, login system, or purchase authority. RevenueCat purchase and entitlement handling lives in the Android client. The backend owns only the conversation runtime: routing, safe candidate selection, state transitions, snapshots, rewind, and recovery behavior.
