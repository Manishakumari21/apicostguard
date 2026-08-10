# APICostGuard — Getting Started

APICostGuard is a local gateway + dashboard that tracks your AI API usage and
cost. It runs entirely on your machine; your API keys and usage data never
leave it.

## Install the app

The desktop app bundles everything, including the local gateway — no coding,
no terminal required.

1. **Download** the installer for your OS from the Releases page
   (`.deb`/`.AppImage` on Linux, `.dmg` on macOS, `.msi`/`.exe` on Windows).
2. **Install and launch** APICostGuard. It starts its local gateway
   automatically, and an icon appears in your system tray. Closing the window
   keeps the app running in the background.
3. **Add your API keys** — open **API Keys** in the app, choose a provider
   (OpenAI, Anthropic, Gemini, Groq, OpenRouter, …), paste your key, and save.
   Keys are stored in your OS credential store
   (Windows Credential Manager / macOS Keychain / encrypted local file on Linux).
4. **Set a budget** — open **Settings → Budget**, pick a monthly limit and an
   alert threshold (default 80%). You'll get a desktop notification as spend
   approaches the limit.

That's all. Local AI servers (Ollama, LM Studio) are detected automatically.

## Route your own tools through the gateway (developers)

Tools like Cursor or Claude Code can talk to the gateway instead of the
provider directly:

```
http://127.0.0.1:8080/v1/chat/completions
```

- Model names that start with `gemini`, `gpt`/`o1`/`o3`/`o4`, `claude`, or
  `llama` are routed to the matching provider automatically.
- Every request is logged: provider, model, tokens, latency, and cost.
- Use the `/proxy` endpoint to pin a specific provider.
- Advanced users can protect the gateway with a token: set
  `APICOSTGUARD_GATEWAY_TOKEN` in `backend/.env`, then send it as a
  `Bearer` token.

## Running from source (developers)

```bash
# 1. Backend gateway (Rust API on http://127.0.0.1:8080)
cd backend
cp .env.example .env   # optional; sane defaults are used without it
cargo run

# 2. Desktop app / frontend
cd frontend/apicostguard
npm install
npm run tauri dev        # native desktop app
# or
npm run dev              # browser mode (http://localhost:1420)
```

The desktop app auto-starts its own gateway when launched; run the backend
manually only if you're working on it or want to change its port.

## Verify everything works

```bash
curl -s http://127.0.0.1:8080/health
# {"status":"ok",...}

curl -s http://127.0.0.1:8080/api/usage
# {"total_requests":0,"total_cost_usd":0.0}
```

## Troubleshooting

- **Empty dashboard** — the gateway is normally started by the app. If you
  launched the app and still see nothing, confirm
  `curl http://127.0.0.1:8080/health` responds; if not, restart the app.
- **Port 8080 already in use** — the app reuses an existing gateway on 8080 if
  it's healthy. If a different program owns the port, stop it or set `PORT` in
  `backend/.env` (the bundled gateway still uses 127.0.0.1:8080).
- **Linux notifications don't show** — install `libnotify-bin` and confirm your
  desktop environment supports notifications.
- **`ACCESS_TOKEN_TYPE_UNSUPPORTED` from Gemini** — some new Gemini `AQ.*` keys
  are rejected by the generation endpoint (Google-side). Use Groq/OpenRouter to
  verify the gateway pipeline.

## Building installers

```bash
cd backend && cargo build --release
cp target/release/apicostguard_backend \
  ../frontend/apicostguard/src-tauri/bin/apicostguard_backend-$(rustc -vV | sed -n 's/host: //p')
cd ../frontend/apicostguard && npm run tauri build
```

Releases are also built automatically when a `v*` tag is pushed (see
`.github/workflows/release.yml`).
