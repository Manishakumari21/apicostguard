# AI CostGuard

> One Desktop App to Monitor, Compare & Control Every AI Provider

## What is this?

Desktop overlay app that monitors AI API spending across ALL providers (OpenAI, Anthropic Claude, Google Gemini, Groq, Mistral, OpenRouter, Together AI, DeepSeek). User pastes their real API key, AI CostGuard tracks lifetime spend, detects anomalies, and alerts via native desktop notifications.

**Zero external dependencies. Pure Rust. 15 MB binary. Download → Run → Done.**

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Rust (2021 edition) |
| Web Framework | Axum 0.7 |
| Database | SQLite (rusqlite) |
| Desktop | Tauri 2.x |
| Frontend | React 19 + TypeScript |
| Runtime | Tokio (async) |

---

## Project Structure

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

## Timeline

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

## Release Plan

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

## Difficulty

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

*Last updated: July 24, 2026*
