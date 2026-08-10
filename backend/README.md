# APICostGuard Backend

Rust backend for API CostGuard — local gateway, usage tracking, and cost/budget engine for AI provider APIs.

## Structure

```
src/
├── main.rs            binary entrypoint
├── lib.rs             library entrypoint (modules + run())
├── api/               HTTP routes and handlers (Axum)
├── config/            app configuration and constants
├── database/          SQLite connection and migrations
├── errors/            typed error types
├── gateway/           local proxy/interceptor
├── middleware/        Axum middleware layers
├── models/            data structures
├── notifications/     desktop notification delivery
├── providers/         provider definitions and cost models
├── security/          API key management
├── services/          business logic layer
├── tests/             integration and unit tests
└── utils/             shared utilities
```

## Quick Start

```bash
cp .env.example .env
cargo run
```

Server starts at `http://127.0.0.1:8080`.

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET | `/version` | Version info |
| GET | `/api/providers` | List providers |
| GET | `/api/usage` | Usage stats |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/budget` | Budget status |
| POST | `/api/notify` | Send notification |
| GET | `/api/settings` | App settings |
