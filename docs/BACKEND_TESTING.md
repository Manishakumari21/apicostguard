# Backend Testing Sequence

Har feature ko **saare steps isi order me** chalana. Server `127.0.0.1:8080` par chal raha maana gaya hai.

## Prerequisites

```bash
# 1. Build
cd backend && cargo build

# 2. Run (background me)
setsid cargo run > /tmp/opencode/server.log 2>&1 < /dev/null &

# 3. Verify server chalu hai
curl -s http://127.0.0.1:8080/health

# 4. Unit + integration tests
cargo test
```

---

## Step 1 — Health & Version

```bash
# Expect: 200, {"status":"ok","environment":"development","uptime_seconds":N}
curl -s http://127.0.0.1:8080/health

# Expect: 200, {"name":"APICostGuard","version":"0.1.0"}
curl -s http://127.0.0.1:8080/version
```

## Step 2 — List Providers

```bash
# Expect: 200, JSON with 7 providers
# gemini, openai, anthropic, openrouter, groq, ollama, lmstudio
curl -s http://127.0.0.1:8080/api/providers
```

## Step 3 — Validate API Key

Real key ke bina bhi response structure check kar sakte ho — fake key se `"valid": false` aana chahiye.

```bash
# Expect: 200, {"provider":"groq","valid":false}
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/validate \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"gsk_fake_key"}'

# Real key se (Groq/OpenRouter free key use karo):
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/validate \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"gsk_REAL_KEY"}'
# Expect: {"provider":"groq","valid":true}

# Saved key se test (keyring me key save hone par body me api_key bhejne ki zaroorat nahi):
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/validate
# Expect: 200 valid:true (saved key) YA 404 {"error":"not_found","message":"no saved API key"}
```

## Step 4 — Save / Delete Saved API Key

Key ko securely keyring me save karo; phir validate/test bina `api_key` body ke saved key use karte hain.

```bash
# Save: Expect 200, {"provider":"groq","saved":true}
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/key \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"gsk_REAL_KEY"}'

# Too short / whitespace key: Expect 400
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/key \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"short"}'

# Unknown provider: Expect 404
curl -s -X POST http://127.0.0.1:8080/api/providers/nope/key \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"gsk_REAL_KEY"}'

# Delete: Expect 200, {"provider":"groq","deleted":true}
curl -s -X DELETE http://127.0.0.1:8080/api/providers/groq/key
```

## Step 5 — Test Request (full pipeline: request → response → tokens → cost)

```bash
# Fake key: Expect 502 with provider_error
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/test \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"gsk_fake_key"}'

# Real key: Expect 200
# {"content":"<model ka reply>","input_tokens":N,"output_tokens":N,"cost_usd":X.XXXX}
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/test \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"gsk_REAL_KEY"}'
```

> Note: 2026 me Gemini key `AQ.Ab...` format ki hoti hai, jo `generateContent` par abhi
> `ACCESS_TOKEN_TYPE_UNSUPPORTED` deti hai (Google-side bug). Gemini test ke liye `?key=` query
> param replace karke `x-goog-api-key` header use kiya gaya hai, par generation endpoint par
> AQ key abhi bhi reject hoti hai. Isliye Groq/OpenRouter se pipeline verify karo.

## Step 6 — Usage / Analytics / Budget / Settings (stubs — Phase 6-12 ka kaam)

```bash
# Expect: 200, {"total_requests":0,"total_cost_usd":0.0}
curl -s http://127.0.0.1:8080/api/usage

# Expect: 200, {"daily_cost":0.0,"monthly_cost":0.0}
curl -s http://127.0.0.1:8080/api/analytics

# Expect: 200, {"monthly_limit":100.0,"current_spend":0.0}
curl -s http://127.0.0.1:8080/api/budget

# Expect: 200, {"log_level":"info","channel_size":1024}
curl -s http://127.0.0.1:8080/api/settings
```

## Step 7 — Notifications

```bash
# Expect: 200, {"sent":true}
curl -s -X POST http://127.0.0.1:8080/api/notifications/send \
  -H 'Content-Type: application/json' \
  -d '{"title":"Budget Alert","message":"80% reached","level":"warning"}'
```

## Step 8 — Error Handling

```bash
# Unknown provider: Expect 400
curl -s -X POST http://127.0.0.1:8080/api/providers/nope/validate \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"x"}'

# Missing route: Expect 404
curl -s http://127.0.0.1:8080/nonexistent

# Missing/empty body: Expect 404 (empty body = saved-key lookup; koi key saved nahi hai to 404)
curl -s -X POST http://127.0.0.1:8080/api/providers/groq/validate \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## Expected Status Code Summary

| Endpoint | Method | Status |
|---|---|---|
| `/health` | GET | 200 |
| `/version` | GET | 200 |
| `/api/providers` | GET | 200 |
| `/api/providers/:id/validate` | POST | 200 (valid/invalid) / 400 (unknown) / 404 (no saved key) / 404 (empty body) |
| `/api/providers/:id/test` | POST | 200 / 502 (provider error) |
| `/api/providers/:id/key` | POST | 200 (saved) / 400 (invalid key) / 404 (unknown provider) |
| `/api/providers/:id/key` | DELETE | 200 (deleted) / 404 (unknown provider) |
| `/api/usage` | GET | 200 |
| `/api/analytics` | GET | 200 |
| `/api/budget` | GET | 200 |
| `/api/settings` | GET | 200 |
| `/api/notifications/send` | POST | 200 |
| unknown route | any | 404 |

## Quick All-in-One (sanity check)

```bash
for ep in health version api/providers api/usage api/analytics api/budget api/settings; do  echo "$ep → $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/$ep)"
done
```
