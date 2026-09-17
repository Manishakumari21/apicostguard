#!/usr/bin/env bash

B=http://127.0.0.1:8080
J='Content-Type: application/json'

echo "════════════ PHASE 1 — Backend Foundation ════════════"
echo "--- 1a. Health check ---"
curl -s $B/health; echo
echo "--- 1b. Version ---"
curl -s $B/version; echo

echo
echo "════════════ PHASE 2-3 — Database + Key Storage ════════════"
echo "--- 3a. Save API key (fake) ---"
curl -s -X POST $B/api/providers/groq/key -H "$J" -d '{"api_key":"gsk_fake_key_12345"}'; echo
echo "--- 3b. Delete key ---"
curl -s -X DELETE $B/api/providers/groq/key; echo
echo "--- 3c. Invalid key rejected ---"
curl -s -X POST $B/api/providers/groq/key -H "$J" -d '{"api_key":"short"}'; echo

echo
echo "════════════ PHASE 4 — Provider Layer ════════════"
echo "--- 4a. List providers ---"
curl -s $B/api/providers; echo
echo "--- 4b. Validate key (fake -> valid:false) ---"
curl -s -X POST $B/api/providers/groq/validate -H "$J" -d '{"api_key":"gsk_fake_key"}'; echo
echo "--- 4c. Test request (fake -> 502 provider_error) ---"
curl -s -X POST $B/api/providers/groq/test -H "$J" -d '{"api_key":"gsk_fake_key"}'; echo

echo
echo "════════════ PHASE 5 — Local Gateway ════════════"
echo "--- 5a. Proxy -> Ollama (success, keyless) ---"
curl -s -X POST $B/proxy -H "$J" -d '{"provider":"ollama","model":"llama3","messages":[{"role":"user","content":"hello there"}]}'; echo
echo "--- 5b. Proxy -> LM Studio (502, service off) ---"
curl -s -X POST $B/proxy -H "$J" -d '{"provider":"lmstudio","model":"local-model","messages":[{"role":"user","content":"hi"}]}'; echo
echo "--- 5c. chat/completions detect gemini (401, no key) ---"
curl -s -X POST $B/v1/chat/completions -H "$J" -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"hi"}]}'; echo
echo "--- 5d. chat/completions detect openai (401, no key) ---"
curl -s -X POST $B/v1/chat/completions -H "$J" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"hi"}]}'; echo
echo "--- 5e. chat/completions detect anthropic (401, no key) ---"
curl -s -X POST $B/v1/chat/completions -H "$J" -d '{"model":"claude-3-5-sonnet","messages":[{"role":"user","content":"hi"}]}'; echo
echo "--- 5f. unknown model (400 bad_request) ---"
curl -s -X POST $B/v1/chat/completions -H "$J" -d '{"model":"xyz-model","messages":[{"role":"user","content":"hi"}]}'; echo
echo "--- 5g. generate endpoint ---"
curl -s -X POST $B/v1/generate -H "$J" -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"hi"}]}'; echo

echo
echo "════════════ PHASE 6 — Usage Engine ════════════"
echo "--- 6a. Usage summary (stub) ---"
curl -s $B/api/usage; echo

echo
echo "════════════ PHASE 7 — Analytics ════════════"
echo "--- 7a. Analytics (stub) ---"
curl -s $B/api/analytics; echo

echo
echo "════════════ PHASE 8 — Budget Engine ════════════"
echo "--- 8a. Budget status (stub) ---"
curl -s $B/api/budget; echo

echo
echo "════════════ PHASE 9 — Notifications ════════════"
echo "--- 9a. Send notification ---"
curl -s -X POST $B/api/notifications/send -H "$J" -d '{"title":"Budget Alert","message":"80% reached","level":"warning"}'; echo

echo
echo "════════════ PHASE 12 — Settings ════════════"
echo "--- 12a. Settings ---"
curl -s $B/api/settings; echo

echo
echo "════════════ ERROR HANDLING ════════════"
echo "--- E1. Unknown provider validate (400) ---"
curl -s -X POST $B/api/providers/nope/validate -H "$J" -d '{"api_key":"x"}'; echo
echo "--- E2. Missing route (404) ---"
curl -s $B/nonexistent; echo
