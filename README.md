# Cost Guard v2

> One Desktop App to Monitor, Compare & Control Every AI Provider

## What is this?

Desktop overlay app that monitors AI API spending across ALL providers (OpenAI, Anthropic Claude, Google Gemini, Groq, Mistral, OpenRouter, Together AI, DeepSeek). User pastes their real API key, Cost Guard tracks lifetime spend, detects anomalies, and alerts via native desktop notifications.

**Zero external dependencies. Pure Rust. 15 MB binary. Download → Run → Done.**

---

## Architecture (Final)

```
React Widgets → Tauri IPC → Axum Backend (Rust)
                                  │
                        ┌─────────┼─────────┐
                        │         │         │
                   Auth      Dashboard   Settings
                   Service    API        Service
                        │         │
                   Spend Service
                        │
                   Gateway (Provider Router)
                        │
              ┌─────────┼─────────┐
           OpenAI    Claude    Gemini    Groq ...
           (compat)  (custom) (custom) (compat)
                        │
                   Usage Aggregator
                        │
                   Budget & Forecast
                      ┌──┼──┐
                   Alert Analytics  Widget
                   Engine Engine   Cache
                      │     │       │
                  Native  Dashboard React
                  Notify  Data    Widgets
                        │
                   Database Layer (SQLite)
                        │
                   SQLite Database
```

**Key Decision:** No LiteLLM. Direct Rust provider integrations. 80% providers use OpenAI-compatible format. One generic client covers them all.

---

## Current File Status (July 22, 2026)

```
backend/
├── .env                              ✅ DONE (DATABASE_URL, ENCRYPTION_KEY, DEV_TOKEN)
├── .env.example                      ✅ DONE (template for users)
├── Cargo.toml                        ✅ NEEDS UPDATE (switch to SQLite)
├── migrations/
│   └── 001_init.sql                  ✅ NEEDS UPDATE (SQLite syntax)
└── src/
    ├── main.rs                       ❌ Empty (wire everything)
    ├── lib.rs                        ❌ New (public exports)
    ├── error.rs                      ✅ DONE (AppError enum)
    │
    ├── config/
    │   ├── mod.rs                    ✅ DONE (pub mod declarations)
    │   ├── env.rs                    ✅ DONE (env var getters)
    │   ├── database.rs               ✅ NEEDS UPDATE (SQLite instead of PostgreSQL)
    │   └── pricing.rs                ✅ DONE (pricing table + provider detection)
    │
    ├── providers/
    │   ├── mod.rs                    ❌ New (Provider trait)
    │   ├── openai_compat.rs          ❌ New (OpenAI + compatible providers)
    │   ├── anthropic.rs              ❌ New (Anthropic Claude)
    │   ├── gemini.rs                 ❌ New (Google Gemini)
    │   └── registry.rs              ❌ New (Provider registration)
    │
    ├── gateway/
    │   ├── mod.rs                    ❌ New (Gateway entry point)
    │   ├── router.rs                 ❌ New (Provider routing + auto logging)
    │   └── usage_logger.rs           ❌ New (SQLite usage logging)
    │
    ├── routes/
    │   ├── mod.rs                    ❌ Empty
    │   ├── keys.rs                   ❌ Empty
    │   ├── spend.rs                  ❌ Empty
    │   ├── alerts.rs                 ❌ Empty
    │   ├── settings.rs               ❌ Empty
    │   └── chat.rs                   ❌ Empty (proxy mode via Gateway)
    │
    ├── models/
    │   ├── mod.rs                    ❌ Empty
    │   ├── key.rs                    ✅ DONE (UserKey, AddKeyRequest, KeyResponse)
    │   ├── usage.rs                  ✅ DONE (UsageLog, UsageLogCreate)
    │   ├── alert.rs                  ❌ Empty (AnomalyAlert struct)
    │   ├── spend.rs                  ✅ DONE (SpendSummary, DailySpend, etc.)
    │   └── settings.rs               ❌ Empty (UserSettings)
    │
    ├── database/
    │   ├── mod.rs                    ❌ New (replaces repository/)
    │   ├── migrations.rs             ❌ New (auto-run migrations)
    │   ├── keys.rs                   ❌ New
    │   ├── usage.rs                  ❌ New
    │   ├── alerts.rs                 ❌ New
    │   ├── spend.rs                  ❌ New
    │   └── settings.rs               ❌ New
    │
    ├── analytics/
    │   ├── mod.rs                    ❌ New
    │   ├── cost_calculator.rs        ❌ New (pricing logic)
    │   └── forecasting.rs            ❌ New (spend forecasting)
    │
    ├── security/
    │   ├── mod.rs                    ❌ New
    │   └── encryption.rs             ❌ New (AES-256-GCM)
    │
    ├── notifications/
    │   ├── mod.rs                    ❌ New
    │   └── desktop.rs                ❌ New (native desktop notify)
    │
    ├── middleware/
    │   ├── mod.rs                    ❌ Empty
    │   └── auth.rs                   ❌ Empty (dev-token + JWT auth)
    │
    └── types/
        └── mod.rs                    ❌ Empty
```

---

## Phase 1 — Backend Foundation & Database

### Checklist

| # | Task | File(s) | Status |
|---|---|---|---|
| 1 | Rust backend setup (Axum) | `main.rs`, `lib.rs` | PENDING |
| 2 | SQLite setup + connection | `config/database.rs` | NEEDS UPDATE |
| 3 | Database schema (6 tables) | `migrations/001_init.sql` | NEEDS UPDATE |
| 4 | Environment config | `config/env.rs`, `.env` | DONE |
| 5 | Error handling | `error.rs` | DONE |
| 6 | Model structs | `models/*.rs` | PARTIAL |
| 7 | Provider trait | `providers/mod.rs` | PENDING |
| 8 | OpenAI-compatible client | `providers/openai_compat.rs` | PENDING |
| 9 | Anthropic client | `providers/anthropic.rs` | PENDING |
| 10 | Gemini client | `providers/gemini.rs` | PENDING |
| 11 | Provider registry | `providers/registry.rs` | PENDING |
| 12 | Gateway router | `gateway/router.rs` | PENDING |
| 13 | Usage logger | `gateway/usage_logger.rs` | PENDING |
| 14 | Authentication (dev-token + JWT) | `middleware/auth.rs` | PENDING |
| 15 | API key encryption (AES-256-GCM) | `security/encryption.rs` | PENDING |
| 16 | Database layer (all queries) | `database/*.rs` | PENDING |
| 17 | Route handlers (all APIs) | `routes/*.rs` | PENDING |
| 18 | Wire main.rs | `main.rs` | PENDING |
| 19 | Test cargo build + run | - | PENDING |

### Implementation Order

1. Config + Models (DONE)
2. Database layer (SQLite queries)
3. Providers (trait + OpenAI-compat + Anthropic + Gemini)
4. Gateway (router + usage logger)
5. Security (encryption)
6. Auth middleware
7. Route handlers
8. Main.rs (wire everything)
9. Test everything

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/keys` | Add a new provider key |
| GET | `/api/keys` | List all keys |
| DELETE | `/api/keys/:id` | Remove/revoke a key |
| POST | `/api/keys/import-env` | Import keys from environment variables |
| GET | `/api/spend` | Lifetime spend summary |
| GET | `/api/spend/daily?days=30` | Daily breakdown |
| GET | `/api/spend/by-key` | Per-key cost breakdown |
| GET | `/api/spend/by-provider` | Per-provider cost breakdown |
| GET | `/api/alerts?limit=20&offset=0` | Paginated alert list |
| GET | `/api/alerts/summary` | Alert statistics |
| POST | `/api/alerts/:id/acknowledge` | Mark alert as read |
| GET | `/api/settings` | Get user preferences |
| POST | `/api/settings` | Update user preferences |
| POST | `/v1/chat/completions` | Chat completion via Gateway |

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Rust (2021 edition) |
| Web Framework | Axum 0.7 |
| Database | SQLite (rusqlite) |
| Provider Layer | Direct Rust integrations |
| HTTP Client | reqwest 0.12 |
| Encryption | AES-256-GCM (aes-gcm crate) |
| Auth | Dev-token + JWT |
| Desktop | Tauri 2.x |
| Frontend | React 19 + TypeScript |
| Runtime | Tokio (async) |

---

## Supported Providers (v1)

| Provider | API Format | Status |
|---|---|---|
| OpenAI | OpenAI-compatible | v1 |
| Anthropic Claude | Custom | v1 |
| Google Gemini | Custom | v1 |
| Groq | OpenAI-compatible | v1 |
| DeepSeek | OpenAI-compatible | v1 |
| Ollama | OpenAI-compatible | v1 |
| Together AI | OpenAI-compatible | v2 |
| OpenRouter | OpenAI-compatible | v2 |
| Mistral | OpenAI-compatible | v2 |

---

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Database | SQLite | Local-first, no setup, WAL mode |
| Provider Layer | Direct Rust | No Python dependency, 15 MB binary |
| Desktop | Tauri 2.x | Small binary (~5-10MB), Rust backend |
| Frontend | React + TypeScript | Modular widget system |
| Encryption | AES-256-GCM | Authenticated encryption for API keys |
| Auth | Dev-token (dev) + JWT (prod) | Simple dev experience + production security |

---

*Last updated: July 22, 2026*
*Current Phase: Phase 1 — Backend Foundation & Database*
