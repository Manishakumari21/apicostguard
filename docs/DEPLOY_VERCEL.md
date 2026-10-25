# Deploying APICostGuard to Vercel + Render

This document covers the serverless proxy that sits between the browser and
the Render backend: what it does, which environment variables to set, how to
deploy, and how to verify it actually works.

## Why a proxy

The backend is protected by a bearer token (`APICOSTGUARD_GATEWAY_TOKEN`).
Anything prefixed `VITE_` is compiled into the public JavaScript bundle, so
putting the token there would publish it to everyone who loads the page.

Instead the browser calls a **same-origin Vercel Function**, and that function
attaches the token server-side:

```
Browser                    Vercel Function              Render backend
------                     ---------------              --------------
GET /api/settings   ───▶   api/index.ts         ───▶    GET /api/settings
(no credential)            reads the token from         Authorization: Bearer
                           process.env, injects it      APICOSTGUARD_GATEWAY_TOKEN
```

The token exists in exactly two places: the **Render** environment (to verify
it) and the **Vercel** environment (to inject it). Both are server-side. It is
never read by `src/`, never emitted in a response body or header, and never
written to a log.

## Files involved

| File | Role |
| --- | --- |
| `frontend/apicostguard/api/index.ts` | The single deployed Vercel Function. Reads `process.env`, delegates. |
| `frontend/apicostguard/api/_proxy.ts` | Routing, header filtering, timeouts, SSRF guard. `_` prefix ⇒ not deployed as its own function. Unit tested. |
| `frontend/apicostguard/vercel.json` | Rewrites `/api/:path*`, `/health`, `/version` into the function. |
| `frontend/apicostguard/.env.web` | `VITE_API_BASE_URL=` (empty ⇒ same-origin). Committed, contains no secret. |
| `frontend/apicostguard/tests/api-proxy.test.ts` | 50 vitest tests. |
| `frontend/apicostguard/vite.config.ts` | Build guard — refuses unsafe configurations. |

## 1. Render environment (backend — unchanged)

Confirm these are still set; this change does not alter them:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APICOSTGUARD_GATEWAY_TOKEN` | a long random secret |
| `ALLOWED_ORIGINS` | comma-separated list including your Vercel origins |

`ALLOWED_ORIGINS` is **not** optional in production: the backend refuses to
start without it (`backend/src/lib.rs`). It still governs any browser client
that talks to Render directly — the web app simply no longer needs it, because
the web app no longer makes cross-origin requests. Do not remove it.

## 2. Vercel project settings

| Setting | Value |
| --- | --- |
| **Root Directory** | `frontend/apicostguard` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` (default) |

**Root Directory is load-bearing.** `api/` and `vercel.json` live next to the
Vite app, so if Root Directory points at the repository root, Vercel will not
deploy the function.

**Build Command matters.** `npm run build` now runs `vite build --mode web`.
That mode is what makes the bundle same-origin; a bare `vite build` fails on
purpose.

## 3. Vercel environment variables (exact)

Add these under **Settings → Environment Variables**, scoped to **Production
and Preview** and available at **runtime** (do not mark them build-only):

| Name | Value | Notes |
| --- | --- | --- |
| `APICOSTGUARD_UPSTREAM_URL` | `https://apicostguard-1.onrender.com` | Origin only — no trailing slash, no path. Read by the function at runtime. |
| `APICOSTGUARD_GATEWAY_TOKEN` | *identical to the Render value* | Server-side secret. Read at runtime. |

And **remove** these if present:

| Name | Why |
| --- | --- |
| `VITE_API_BASE_URL` | The build **fails** if it is non-empty for a web build. `.env.web` already supplies the correct value. |
| `VITE_API_TOKEN` | The build **fails** if it exists at all. There is no client-side token. |

The build failures are deliberate: they are the guard rails that stop an
insecure configuration from being deployed silently.

## 4. Deploy

```bash
cd frontend/apicostguard
npm ci
npm test
npm run build          # must succeed locally before pushing
cd ../..
git add -A
git commit -m "Add Vercel serverless proxy for the gateway token"
git push
```

Vercel builds on push. To deploy explicitly instead:

```bash
cd frontend/apicostguard && npx vercel --prod
```

## 5. Verification — do not assume it worked

Replace `<domain>` with your deployment URL. Each check isolates one layer.

```bash
# 1. Rewrite + proxy + origin are wired up.
curl -i https://<domain>/health
#   expect 200 and {"status":"ok","environment":"production",...}

# 2. Token injection works. A 401 here means the Vercel token does NOT match
#    Render's; a 200 means the whole chain is authenticating.
curl -i https://<domain>/api/settings
#   expect 200 with the settings JSON

# 3. The money-spending gateway routes are NOT exposed.
curl -i -X POST https://<domain>/v1/chat/completions -H 'content-type: application/json' -d '{}'
curl -i -X POST https://<domain>/proxy               -H 'content-type: application/json' -d '{}'
#   expect 404 for both

# 4. The proxy does not hand out CORS.
curl -i -X OPTIONS https://<domain>/api/settings \
#   expect 405, with no access-control-allow-origin header

# 5. The secret is not in the bundle.
grep -r "APICOSTGUARD_GATEWAY_TOKEN" frontend/apicostguard/dist/assets/ | wc -l
#   expect 0
```

In the browser (the check that actually matters):

1. Open the app, DevTools → **Network**.
2. Every API request must go to the **same origin** (`/api/...`), not to
   `onrender.com`.
3. The request headers must contain **no `Authorization` header**.
4. Status must be 200, and the page must render data.

Also confirm the preview URL's protection state. If Vercel **Deployment
Protection** is enabled, anonymous `curl` will get a `302` to
`vercel.com/sso-api` — that is Vercel auth, not your app. Either authenticate
your curl (use the deployment's *Protection Bypass for Automation* secret with
the `x-vercel-protection-bypass` header) or check from a logged-in browser.

## What this protects, and what it does not

**Protected**

- The gateway token is not in the bundle, in `import.meta.env`, in any client
  response, or in any log line.
- A caller-supplied `Authorization` header or cookie is discarded by the proxy;
  the server-side token always wins.
- The backend's `require_local_token` middleware and `ALLOWED_ORIGINS` config
  are untouched — the backend still authenticates every request.
- The gateway routes that actually spend money (`/v1/chat/completions`,
  `/v1/generate`, `/proxy`) are **not** rewritten into the proxy and are
  structurally unreachable through it.
- Upstream timeouts (8 s), a 1 MiB body cap, method allowlisting, and an origin
  check that blocks `//host` and absolute-URL escapes.

**Not protected — read this**

Because the proxy holds the token, **anyone who can load the Vercel URL can
drive the management API** (read dashboards, change settings and budgets, save
or delete provider keys, clear history). The proxy authenticates on their
behalf.

Mitigations, in order of strength:

1. Keep **Vercel Deployment Protection** (or Password Protection) enabled so
   only you can reach the deployment. This is the default on preview URLs and
   is what the current deployment relies on.
2. Put the app behind your own identity layer if it must be public.
3. Do not expose `/v1/*` or `/proxy` through a rewrite. Adding them would hand
   strangers the ability to spend money on upstream LLM calls.

There is no way to keep a static SPA's credential secret *and* let any
anonymous visitor call an authenticated API — that is what this design
accepts. Choose the access gate accordingly.

## Build modes

| Command | Mode | `VITE_API_BASE_URL` | Used by |
| --- | --- | --- | --- |
| `npm run build` | `web` | must be empty (`.env.web`) | Vercel |
| `npm run build:desktop` | `desktop` | absolute URL, or unset ⇒ `http://localhost:8080` (the Tauri sidecar) | `tauri build` |
| anything else | — | **build fails** | — |

`import.meta.env.MODE === "web"` also forces the client's base URL to `""`, so
a dropped env var can never fall back to a direct backend call.

> `frontend/apicostguard/.env.production` is a local, untracked file. No build
> script reads it any more; only `npm run dev` (via `.env.local`) and
> `npm run build:desktop` can supply a desktop backend URL.

## Tests

```bash
cd frontend/apicostguard
npm test          # 50 tests: routing, header filtering, SSRF, timeouts, secret leakage
npm run build     # typecheck + web production build
```

CI runs `npm test` and `npm run build` on every push
(`.github/workflows/ci.yml`).

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Build fails: `VITE_API_BASE_URL must be empty for web builds` | `VITE_API_BASE_URL` is still set in Vercel. Delete it. |
| Build fails: `VITE_API_TOKEN must never be set` | Delete `VITE_API_TOKEN` from Vercel and any local `.env`. |
| Build fails: `Refusing to build with mode "production"` | The Build Command is not `npm run build`. Fix it in Vercel. |
| `502` from `/api/...` | Render is unreachable (cold start, or `APICOSTGUARD_UPSTREAM_URL` wrong). |
| `500` `proxy_misconfigured` | `APICOSTGUARD_UPSTREAM_URL` missing or malformed. Check Vercel function logs for the one-line reason. |
| `401` from `/api/...` | The Vercel and Render `APICOSTGUARD_GATEWAY_TOKEN` values differ. |
| `504` | The origin took longer than 8 s — usually a Render cold start. |
| App loads but every request 404s | Root Directory or `vercel.json` is wrong; the rewrites are not deployed. |
