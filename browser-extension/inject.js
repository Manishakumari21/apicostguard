// Injected into page context to intercept fetch/XHR
// This runs in the page's JS context, not the extension's

(function () {
  "use strict";

  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === "string" ? resource : resource?.url || "";

    const resp = await _fetch.apply(this, args);

    // Only intercept AI chat endpoints
    if (isChatEndpoint(url)) {
      const clone = resp.clone();
      consumeStream(clone, url).catch(() => {});
    }

    return resp;
  };

  function isChatEndpoint(url) {
    return (
      url.includes("/backend-api/conversation") || // ChatGPT
      url.includes("/v1/chat/completions") || // OpenAI compat
      url.includes("/api/messages") || // Claude
      url.includes(":generateContent") || // Gemini
      url.includes(":streamGenerateContent") // Gemini streaming
    );
  }

  async function consumeStream(resp, url) {
    try {
      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
        // Streaming response - collect all chunks
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let usageData = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Try to extract usage from SSE lines
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.usage) {
                  usageData = json.usage;
                }
                if (json.model) {
                  usageData = usageData || {};
                  usageData.model = json.model;
                }
              } catch {
                // Not JSON, skip
              }
            }
          }
        }

        if (usageData) {
          reportUsage(extractProvider(url), usageData);
        }
      } else {
        // Regular JSON response
        const json = await resp.json();
        if (json.usage) {
          reportUsage(extractProvider(url), {
            model: json.model,
            ...json.usage,
          });
        }
      }
    } catch {
      // Silently fail
    }
  }

  function extractProvider(url) {
    if (url.includes("openai.com") || url.includes("chatgpt.com")) return "openai";
    if (url.includes("claude.ai") || url.includes("anthropic.com")) return "anthropic";
    if (url.includes("googleapis.com") || url.includes("gemini")) return "google";
    return "unknown";
  }

  function reportUsage(provider, data) {
    const prompt =
      data.prompt_tokens || data.input_tokens || 0;
    const completion =
      data.completion_tokens || data.output_tokens || 0;
    const total = data.total_tokens || prompt + completion;

    // Calculate cost based on known pricing
    const cost = calculateCost(data.model || "", prompt, completion);

    window.postMessage(
      {
        type: "__COSTGUARD_USAGE__",
        data: {
          provider,
          model: data.model || "unknown",
          prompt_tokens: prompt,
          completion_tokens: completion,
          total_tokens: total,
          cost_usd: cost,
        },
      },
      "*"
    );
  }

  function calculateCost(model, prompt, completion) {
    const PRICING = {
      "gpt-4o": [2.5, 10.0],
      "gpt-4o-mini": [0.15, 0.6],
      "gpt-4-turbo": [10.0, 30.0],
      "claude-sonnet-4": [3.0, 15.0],
      "claude-3-5-sonnet": [3.0, 15.0],
      "claude-3-haiku": [0.25, 1.25],
      "gemini-2.5-pro": [1.25, 10.0],
      "gemini-2.5-flash": [0.15, 0.6],
      "deepseek-chat": [0.14, 0.28],
    };

    const m = model.toLowerCase();
    for (const [key, [input, output]] of Object.entries(PRICING)) {
      if (m.includes(key)) {
        return (prompt * input + completion * output) / 1_000_000;
      }
    }
    return 0;
  }
})();
