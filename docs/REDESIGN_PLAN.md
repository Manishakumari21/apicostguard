# APICostGuard Redesign Plan (LiteLLM-style, own identity)

## 1. Current state

### Frontend pages
- Dashboard, Costs, Models, Requests, Providers, APIKeys, Budgets, Alerts, Optimize, Gateway, Settings, About, NotFound.

### Key components
- Layout: `Sidebar`, `Header`
- Common: `Brand`, `Button`, `Modal`, `Loader`, `EmptyState`, `ErrorBoundary`, `ToastHost`, `Toggle`, `DataBridge`, `UpdateNotifier`
- UI: `MetricCard`, `Panel`, `PageHeader`, `AlertCard`, `BudgetProgress`, `CapacityGauge`, `DataState`, `FilterBar`, `GatewayStatusBadge`, `Icons`, `RequestDetail`, `RequestTable`, `StatusIndicator`, `AppActionBar`, `DownloadSection`, `UpdateCheck`
- Charts: `BarChart`, `DonutChart`, `LineChart`
- Motion: `reveal`, `spotlight`

### Services
- HTTP client `backend.ts` (Axum API), plus `monitor.ts` (Tauri fallback), `settings.ts`, `apiKeys.ts`, `notification.ts`, and domain services (dashboard, cost, model, request, provider, budget, alert, optimize, gateway, appInfo, external, releases, update, series, tauri).

### Backend routes (high level)
- Public: `/health`, `/version`
- Protected (token when set): providers, usage, analytics, projects, dashboard, history, budgets, settings, notifications
- Gateway: `/v1/*` (chat completions, generate, proxy)

### Mocked / demo fallback
- Frontend falls back to Tauri commands and empty states when backend offline.
- `optimizeService.ts` marks some optimizations `demo: true`.
- No other broad demo data.

## 2. Dashboard information architecture

Sidebar (existing):
- Dashboard
- Costs
- Models
- Requests
- Providers
- API Keys
- Budgets
- Alerts
- Optimize
- Gateway
- Settings
- About

Page → primary endpoint:
- Dashboard → `/dashboard` (and `/api/dashboard`)
- Costs → `/api/analytics`, `/api/usage/daily-summary`
- Models → `/api/analytics`
- Requests → `/history`, `/api/usage`
- Providers → `/api/providers`
- API Keys → `/api/providers/:id/key`, `/api/providers/:id/validate`
- Budgets → `/api/budgets`, `/api/budget`
- Alerts → `/api/notifications`
- Optimize → client-side (some demo)
- Gateway → `/health`, gateway status
- Settings → `/api/settings`
- About → `/version`, app info

Needs new backend endpoint:
- None strictly required for parity; optional: `/api/providers/:id/models` for model lists, `/api/usage/export`.

## 3. Landing / "get started" page

Section order:
1. Hero: gateway diagram (request → APICostGuard → provider)
2. Provider + tool icon grid (Gemini, OpenAI, Anthropic, OpenRouter, Groq, Ollama, LM Studio; Cursor, Claude Code, scripts)
3. OS-tabbed quick start (copy buttons) for Windows/macOS
4. Numbered feature sections: local-first privacy, cost tracking, budgets, project tracking, analytics
5. Install/download CTA

Real facts only:
- Supported providers: Gemini, OpenAI, Anthropic, OpenRouter, Groq, Ollama, LM Studio
- Local-first: runs on 127.0.0.1:8080 by default
- License: see repo (MIT if present — verify)
- Budgets: daily/monthly with alerts
- Project tracking: per-project usage

## 4. Icon plan
- Provider icons: simple SVG monograms or brand glyphs in `components/ui/Icons.tsx`; fallback to first letter in a colored circle.
- Tool icons: Cursor/Claude Code/scripts as generic monochrome glyphs; fallback to text label.
- UI icons: inline SVGs (current approach).

## 5. Install plan (Windows/macOS)
- Release workflow (`.github/workflows/release.yml`) already builds Windows (x86_64-pc-windows-msvc) and macOS (aarch64 + x86_64) via Tauri, publishes draft GitHub Release.
- Missing: Linux removed (per request), code signing secrets (`TAURI_SIGNING_PRIVATE_KEY`), and updater feed verification (`latest.json`). Ensure sidecar binary staged with correct target name.

## 6. Task list (build order)
1. Add landing page component + route (files: `src/pages/Landing.tsx`, `src/routes.tsx`) — small.
2. Create gateway diagram component (files: `src/components/common/GatewayDiagram.tsx`).
3. Add provider/tool icon tiles (files: `src/components/ui/ProviderTile.tsx`, update `Icons.tsx`).
4. OS-tabbed quick start with copy button (files: `src/components/common/QuickStart.tsx`).
5. Numbered feature sections (files: `src/pages/Landing.tsx` sections).
6. Polish sidebar/admin layout (files: `Sidebar.tsx`, `Header.tsx`, `App.tsx`).
7. Verify download links point to GitHub Releases (files: `DownloadSection.tsx`).
8. Docs: update README install steps.

## Questions I could not answer from the code
- Is the project licensed MIT? (check LICENSE file.)
- Are there real screenshots/assets to use? (none found.)
- Which OS tab should be default on landing?
- Should the landing page be the app entry or a separate marketing site?
- Are provider logos available with acceptable licensing?
