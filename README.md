# APICostGuard

> Cross-platform desktop application that monitors AI API usage and estimated costs across AI-powered tools and providers.

APICostGuard sits as a **local gateway** between your AI-powered tools (Cursor, Claude Code, custom scripts, etc.) and AI providers (Gemini, OpenAI, Anthropic). Every request passes through the gateway, which measures latency, counts tokens, calculates cost, and logs usage — all before returning the response.

The application runs locally to protect user privacy and provides a single dashboard for monitoring AI consumption across multiple providers, projects, and budgets.

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
│   └── 0004_notifications.sql
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
│   │   ├── connection.rs
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
│   │   ├── scheduler.rs
│   │   └── tray.rs
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
│   │   ├── request_id.rs
│   │   └── error_handler.rs
│   │
│   ├── errors/          · typed error types
│   │   ├── mod.rs
│   │   ├── app_error.rs
│   │   ├── provider_error.rs
│   │   └── database_error.rs
│   │
│   ├── utils/           · shared utilities
│   │   ├── mod.rs
│   │   ├── response.rs
│   │   ├── helpers.rs
│   │   ├── datetime.rs
│   │   ├── validator.rs
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

### Phase 12 — Backend API
- `GET /dashboard`, `/history`, `/projects`, `/budgets`, `/analytics`
- `GET /api/settings`, `POST /settings`, `/providers`, `/budgets`
- **Deliverable**: Frontend can consume all required data

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
| GET | `/projects` | 12 |
| POST | `/settings` | 12 |
| POST | `/providers` | 12 |
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

## Quick Start

```bash
# Backend
cd backend && cargo run

# Frontend
cd frontend/apicostguard && npm install && npm run dev
```

*Last updated: July 30, 2026*
