# Second Take Local Backend v0.6

Local-only Fastify service that orchestrates the frozen Second Take semantic stack. It binds to `127.0.0.1`, keeps scenario state and hidden facts server-side, and uses Vertex AI Global Standard PayGo through ADC.

## Requirements

- Node.js 22+
- Google Cloud CLI with Application Default Credentials
- Access to the already-authorized Google Cloud project and Vertex AI API

## Local setup

```powershell
gcloud auth application-default login
$env:VERTEX_PROJECT_ID = "your-existing-project-id"
npm install
npm run verify
npm start
```

Optional configuration is listed in `.env.example`. ADC files, OAuth tokens, API keys and credential JSON must never be copied into this repository.

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
- `npm run verify` — build, tests and secret scan
- `npm run benchmark:local` — provider-free overhead benchmark
- `npm run smoke` — controlled real Vertex smoke; incurs usage

No deployment, public binding, Android integration, login, RevenueCat or Coach is included in v0.6.
