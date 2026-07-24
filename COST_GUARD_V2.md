# AI CostGuard v2 — Complete Design Document

> One Desktop App to Monitor, Compare & Control Every AI Provider

---

## 1. Vision

AI CostGuard is a cross-platform desktop application that monitors AI API spending across ALL providers from one place. Users simply add their API keys once — AI CostGuard silently tracks lifetime spend, detects anomalies, and alerts via native desktop notifications.

**Zero external dependencies. Pure Rust. 15 MB binary. Download → Run → Done.**

Goal: Make AI spending as easy to understand as battery percentage — users should always know how much they've spent, how much budget remains, and whether abnormal spending is occurring.

---

## 2. Problem Statement

AI developers use multiple providers (OpenAI, Anthropic, Google Gemini, Groq, OpenRouter, Together AI, etc.). The challenges:

- Spending information scattered across different provider dashboards
- Users frequently exceed budgets without realizing it
- Unexpected costs discovered only after invoices arrive
- No unified monitoring tool across providers
- Monitoring multiple API keys is difficult
- Teams have limited visibility into AI usage

**AI CostGuard solves this through continuous monitoring, intelligent alerts, and a unified desktop experience.**

---

## 3. Target Users

| User Type | Why They Need AI CostGuard |
|---|---|
| Individual Users | Personal AI projects, budget tracking |
| Students | Limited credits, need visibility |
| Developers | Multiple API keys, per-project budgets |
| Freelancers | Multiple AI clients |
| Startups | Team-wide API expense monitoring |
| Teams/Enterprise | Multi-key management, alerts |

---

## 4. Timeline

| Phase | Work | Estimated Time |
|---|---|---|
| Phase 1 | Rust backend (Axum, event engine, notifications) | 2–3 weeks |
| Phase 2 | React + Tauri desktop UI | 2 weeks |
| Phase 3 | Dashboard & widgets | 1–2 weeks |
| Phase 4 | Chrome/Edge extension | 2–3 weeks |
| Phase 5 | Cursor, VS Code, Claude Code integrations | 3–4 weeks |
| Phase 6 | Ollama & LM Studio support | 1 week |
| Phase 7 | LiteLLM mode | 1 week |
| Phase 8 | Analytics & reports | 2 weeks |
| Phase 9 | Testing, bug fixes, installers | 2–3 weeks |

**Total:** ~16–20 weeks (4–5 months) part-time / **2–3 months** full-time.

---

## 5. Release Plan

### Version 1.0 (4–6 weeks)
- Rust backend
- React + Tauri desktop app
- Native system notifications
- Dashboard & settings
- Cursor integration
- Ollama & LM Studio support

### Version 1.5
- Browser extension (ChatGPT, Gemini, Claude)

### Version 2.0
- VS Code, Claude Code, OpenCode, LiteLLM mode

### Version 3.0
- Analytics, forecasting, cost optimization, advanced widgets, export reports

---

## 6. Difficulty

| Area | Difficulty (1–10) |
|---|---|
| Rust backend | 7 |
| React frontend | 5 |
| Tauri integration | 6 |
| Browser extension | 7 |
| Cursor/IDE integrations | 8 |
| Widgets | 6 |
| Native notifications | 3 |
| LiteLLM mode | 4 |
| Cross-platform packaging | 8 |

**Overall:** 8.5/10

---

## 7. Project Structure

```
ai-costguard/
├── backend/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── app.rs
│       ├── state.rs
│       ├── api/
│       ├── connectors/
│       │   ├── browser/
│       │   ├── desktop/
│       │   ├── local/
│       │   └── gateway/
│       ├── monitoring/
│       ├── notifications/
│       ├── widgets/
│       ├── models/
│       └── utils/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── store/
│       ├── types/
│       ├── utils/
│       └── styles/
│
└── browser-extension/
```

---

## 8. Tech Stack

| Component | Technology |
|---|---|
| Language | Rust (2021 edition) |
| Web Framework | Axum 0.7 |
| Database | SQLite (rusqlite) |
| Desktop | Tauri 2.x |
| Frontend | React 19 + TypeScript |
| Runtime | Tokio (async) |

---

## 9. Connectors

| Connector | Type | Status |
|---|---|---|
| Chrome | Browser extension | Planned |
| Edge | Browser extension | Planned |
| Cursor | Desktop app | Planned |
| VS Code | Desktop app | Planned |
| Claude Code | Desktop app | Planned |
| OpenCode | Desktop app | Planned |
| Ollama | Local model | Planned |
| LM Studio | Local model | Planned |
| LiteLLM | Gateway proxy | Planned |

---

*Last updated: July 24, 2026*
