# APICostGuard

> Cross-platform desktop application that monitors AI API usage and estimated costs across AI-powered tools and providers.

APICostGuard sits as a **local gateway** between your AI-powered tools (Cursor, Claude Code, custom scripts, etc.) and AI providers (Gemini, OpenAI, Anthropic). Every request passes through the gateway, which measures latency, counts tokens, calculates cost, and logs usage — all before returning the response.

The application runs locally to protect user privacy and provides a single dashboard for monitoring AI consumption across multiple providers, projects, and budgets.

## Install & use the app (no coding required)

The desktop app bundles everything — the dashboard *and* the local gateway. One
install, nothing to run from a terminal.

1. **Install the app** — grab the installer for your OS from the
   [Releases](https://github.com/Manishakumari21/apicostguard/releases) page
   (`.deb`/`.AppImage` on Linux, `.dmg` on macOS, `.exe` on Windows).
2. **Launch APICostGuard** — it starts the local gateway automatically (an icon
   appears in your system tray; closing the window keeps it running).
3. **Add your API keys** — open **API Keys** in the app, pick a provider
   (OpenAI, Anthropic, Gemini, Groq, OpenRouter, …), paste your key, and save.
   Keys are stored in your OS credential store and never leave your machine.
4. **Set a budget** — open **Settings → Budget**, pick a monthly limit and an
   alert threshold. You'll get a desktop notification when you approach the
   limit.

That's it. Local AI servers (Ollama, LM Studio) are detected automatically.

For developers who want to route their own tools through the gateway, point them
at `http://127.0.0.1:8080/v1/chat/completions` — the gateway auto-detects the
provider from the model name and logs every request (tokens, latency, cost).

## Tech Stack

| Component | Technology |
|---|---|---|
| Backend | Rust + Axum + Tokio + Tower |
| Frontend | React 19 + TypeScript |
| Desktop | Tauri 2.x |
| Database | SQLite (via rusqlite) |
| Keychain | Windows Credential Manager / macOS Keychain / Linux libsecret |
| Providers | Gemini, OpenAI, Anthropic, OpenRouter, Groq, Ollama, LM Studio |

## Architecture

```
                Desktop Apps
                      │
                      ▼
              Axum HTTP Server
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   Provider API   Usage Engine  Budget Engine
        │             │             │
        └─────────────┼─────────────┘
                      │
              Analytics Engine
                      │
                      ▼
                 SQLite Database
                      │
                      ▼
              REST API for Frontend
```

## Project Structure

```
backend/
├── Cargo.toml
├── Cargo.lock
├── .env
├── .gitignore
├── migrations/          · SQL migration files
│   ├── 0001_initial.sql
│   ├── 0002_budget.sql
│   ├── 0003_projects.sql
│   ├── 0004_notifications.sql
│   └── 0005_daily_budget.sql
│
├── src/
│   ├── main.rs
│   ├── lib.rs
│   │
│   ├── api/             · HTTP routes and handlers
│   │   ├── mod.rs
│   │   ├── routes.rs    · Axum Router assembly, AppState
│   │   └── handlers/    · per-endpoint handlers
│   │       ├── mod.rs
│   │       ├── health.rs
│   │       ├── provider.rs
│   │       ├── usage.rs
│   │       ├── analytics.rs
│   │       ├── budget.rs
│   │       ├── settings.rs
│   │       └── notification.rs
│   │
│   ├── config/          · app config, environment loading
│   │   ├── mod.rs
│   │   ├── settings.rs
│   │   └── constants.rs
│   │
│   ├── database/        · SQLite connection and migrations
│   │   ├── mod.rs
│   │   ├── sqlite.rs
│   │   ├── repository.rs
│   │   └── migrations.rs
│   │
│   ├── gateway/         · local proxy/interceptor for provider APIs
│   │   ├── mod.rs
│   │   ├── proxy.rs
│   │   ├── interceptor.rs
│   │   ├── pricing.rs
│   │   ├── tokenizer.rs
│   │   └── metrics.rs
│   │
│   ├── providers/       · provider definitions and cost models
│   │   ├── mod.rs
│   │   ├── provider.rs  · Provider trait + struct
│   │   ├── gemini.rs
│   │   ├── openai.rs
│   │   ├── anthropic.rs
│   │   ├── openrouter.rs
│   │   ├── groq.rs
│   │   ├── ollama.rs
│   │   └── lmstudio.rs
│   │
│   ├── models/          · data structures for all domains
│   │   ├── mod.rs
│   │   ├── usage.rs
│   │   ├── provider.rs
│   │   ├── analytics.rs
│   │   ├── budget.rs
│   │   ├── project.rs
│   │   ├── settings.rs
│   │   ├── notification.rs
│   │   └── dashboard.rs
│   │
│   ├── services/        · business logic layer
│   │   ├── mod.rs
│   │   ├── provider_service.rs
│   │   ├── usage_service.rs
│   │   ├── analytics_service.rs
│   │   ├── budget_service.rs
│   │   ├── settings_service.rs
│   │   ├── notification_service.rs
│   │   ├── dashboard_service.rs
│   │   └── project_service.rs
│   │
│   ├── notifications/   · desktop notification delivery
│   │   ├── mod.rs
│   │   ├── desktop.rs
│   │   └── scheduler.rs
│   │
│   ├── security/        · API key management and encryption
│   │   ├── mod.rs
│   │   ├── keyring.rs
│   │   ├── encryption.rs
│   │   └── auth.rs
│   │
│   ├── middleware/      · Axum middleware layers
│   │   ├── mod.rs
│   │   ├── logger.rs
│   │   ├── cors.rs
│   │   └── error_handler.rs
│   │
│   ├── errors/          · typed error types
│   │   ├── mod.rs
│   │   └── app_error.rs
│   │
│   ├── utils/           · shared utilities
│   │   ├── mod.rs
│   │   ├── helpers.rs
│   │   ├── datetime.rs
│   │   ├── parent_watch.rs
│   │   └── shutdown.rs
│   │
│   └── tests/           · integration and unit tests
│       ├── mod.rs
│       ├── integration_test.rs
│       ├── provider_test.rs
│       ├── gateway_test.rs
│       └── analytics_test.rs

frontend/
├── apicostguard/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/  · layout, dashboard, common, ui, charts, widget
│   │   ├── pages/       · Dashboard, Analytics, Providers, Projects, History, Budget, Settings
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   └── styles/
│   ├── src-tauri/       · Tauri native shell
│   │   ├── bin/         · bundled backend gateway (sidecar)
│   │   └── src/         · sidecar spawn, tray, monitor commands
│   └── index.html
├── public/
└── src/                 · (placeholder)
```

## Development Phases

### Phase 1 — Backend Foundation
- Rust project with Axum server
- Configuration management (environment loading, dev only)
- Logging with `tracing`
- Error handling (typed errors, graceful shutdown)
- `GET /health`, `GET /version`
- **Deliverable**: Backend starts successfully

### Phase 2 — Database Layer
- SQLite database
- Tables: `settings`, `providers`, `budgets`, `usage_logs`, `projects`, `notifications`
- `database/connection.rs`, `database/migrations.rs`, `database/repository.rs`
- **Deliverable**: CRUD operations working

### Phase 3 — Secure API Key Management
- `security/keyring.rs`
- `save_key()`, `load_key()`, `delete_key()`, `validate_key()`
- Windows Credential Manager / macOS Keychain / Linux libsecret
- **Deliverable**: User can securely save a Gemini key

### Phase 4 — Provider Layer
- Common `Provider` trait: `validate_key()`, `send_request()`, `list_models()`
- `providers/gemini.rs`, `providers/openai.rs`, `providers/anthropic.rs`, `providers/openrouter.rs`, `providers/groq.rs`
- Local providers: `providers/ollama.rs`, `providers/lmstudio.rs`
- `GET /api/providers`
- **Deliverable**: Validate API key and send a test request

### Phase 5 — Local Gateway
- `POST /v1/chat/completions`, `POST /v1/generate`, `POST /proxy`
- Detect provider → forward request → measure latency → read usage metadata → calculate cost → return response
- **Deliverable**: Cursor or another client can send requests through your gateway

### Phase 6 — Usage Engine
- `services/usage_service.rs`
- Record every request: provider, model, input tokens, output tokens, latency, cost, timestamp, status
- **Deliverable**: Every request is logged

### Phase 7 — Cost Engine
- `pricing/gemini.rs`, `pricing/openai.rs`, `pricing/anthropic.rs`
- `calculate_cost()`, `calculate_tokens()`, `estimate_monthly_cost()`
- **Deliverable**: Accurate cost calculation

### Phase 8 — Budget Engine
- `services/budget_service.rs`
- Daily/monthly budgets with threshold alerts (80% warn, 100% critical)
- Optional request blocking when budget exceeded
- **Deliverable**: Budget tracking works

### Phase 9 — Notification Service
- `notifications/desktop.rs`, `notifications/scheduler.rs`
- Events: budget exceeded, API key invalid, provider unavailable, daily summary
- **Deliverable**: Native desktop notifications

### Phase 10 — Analytics Engine
- `services/analytics_service.rs`
- Daily/weekly/monthly summaries, provider/project statistics, average latency, success rate
- **Deliverable**: Backend can generate analytics

### Phase 11 — Project Detection
- `services/project_service.rs`
- Per-project usage: name, provider, model, cost, tokens, requests
- **Deliverable**: Per-project usage is stored

### Phase 12 — Frontend Integration
- Backend API: `GET /dashboard`, `/history`, `/projects`, `/budgets`, `/analytics`, `DELETE /api/history`
- `GET /api/settings`, `POST /settings`, `/providers`, `/budgets`
- Frontend service layer (`services/backend.ts`, `monitor.ts`, `settings.ts`, `apiKeys.ts`, `notification.ts`) fetches from the Rust API at `http://localhost:8080`, with automatic fallback to Tauri/demo data when the backend is offline
- API keys persist to the OS keychain via `POST /api/providers/:id/key`, validated via `POST /api/providers/:id/validate`
- **Deliverable**: Frontend consumes real backend data end-to-end

## API Endpoints

| Method | Route | Phase |
|---|---|---|
| GET | `/health` | 1 |
| GET | `/version` | 1 |
| GET | `/api/providers` | 4 |
| POST | `/v1/chat/completions` | 5 |
| POST | `/v1/generate` | 5 |
| POST | `/proxy` | 5 |
| GET | `/api/usage` | 6 |
| GET | `/api/analytics` | 7 |
| GET | `/api/budget` | 8 |
| POST | `/api/notify` | 9 |
| GET | `/api/settings` | 12 |
| GET | `/dashboard` | 12 |
| GET | `/history` | 12 |
| DELETE | `/api/history` | 12 |
| GET | `/projects` | 12 |
| POST | `/settings` | 12 |
| POST | `/providers` | 12 |
| POST | `/providers/:id/validate` | 12 |
| POST | `/providers/:id/key` | 12 |
| DELETE | `/providers/:id/key` | 12 |
| POST | `/budgets` | 12 |

## Development Order

1. **Foundation** (Axum, config, logging)
2. **Database**
3. **Secure API key storage**
4. **Gemini provider**
5. **Local gateway**
6. **Usage logging**
7. **Cost calculation**
8. **Budget engine**
9. **Notifications**
10. **Analytics**
11. **Project tracking**
12. **Frontend integration**

This order minimizes rework because each phase builds on the previous one. By the time you reach the frontend, the backend already exposes stable APIs and contains all the business logic.

## Quick Start (developers)

The desktop app is the main product: it bundles and auto-starts the backend
gateway, so `cargo run` is **not** required when using the app.

For development you can run the pieces independently:

```bash
# 1. Start the backend (Rust API on http://localhost:8080)
cd backend && cargo run

# 2. Start the frontend (Vite dev server)
cd frontend/apicostguard && npm install && npm run dev

# 3. Open http://localhost:5173 (browser) — the UI talks to the backend
#    Or run the native desktop shell:
#    cd frontend/apicostguard && npm run tauri dev
```

The frontend falls back to Tauri commands (and empty states when nothing is running) automatically if the backend is offline, so either can be started independently.

### Building the desktop app with the bundled gateway

```bash
# Build the backend sidecar once, then build the app
cd backend && cargo build --release
cp target/release/apicostguard_backend \
  ../frontend/apicostguard/src-tauri/bin/apicostguard_backend-$(rustc -vV | sed -n 's/host: //p')
cd ../frontend/apicostguard && npm run tauri build
```

On startup the app reuses an already-running gateway on port 8080 if one is
healthy, otherwise it spawns the bundled binary (which shuts down automatically
when the app exits). Set `PORT`/`HOST` in `backend/.env` to change the gateway
address used by the app (the bundled gateway always uses `127.0.0.1:8080`).

## End-user guide

See [docs/ONBOARDING.md](docs/ONBOARDING.md) for setup, adding your first provider,
pointing AI tools at the gateway, and troubleshooting.

## CI / Releases

- `.github/workflows/release.yml` — triggered on a `v*` tag push; builds the sidecar gateway
  plus desktop installers on Linux, Windows, and macOS and publishes a draft
  GitHub Release with the `latest.json` updater feed.
- The in-app Download and "Check for updates" sections are wired to GitHub
  Releases — they work automatically once releases are published.
- Secrets (`backend/.env`, `*.db`, `*.key`, `*.enc`) are gitignored and never committed.

For the full release pipeline (signing key, GitHub secrets, tagging steps,
testing updates) see **[RELEASE.md](RELEASE.md)**.

## Tests & Verification

```bash
# Backend: 24 tests (cargo clippy -- -D warnings clean, cargo fmt clean)
cd backend && cargo test

# Frontend: typecheck + production build
cd frontend/apicostguard && npm run build

# Endpoint smoke test (backend must be running)
bash docs/test_all_phases.sh
```

*Last updated: August 10, 2026*
