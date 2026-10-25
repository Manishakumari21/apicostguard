import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_METHODS,
  buildTargetUrl,
  cleanSearch,
  filterRequestHeaders,
  filterResponseHeaders,
  handleProxyRequest,
  parseRequestUrl,
  upstreamPathFor,
} from "../api/_proxy";

const ORIGIN = "https://apicostguard-1.onrender.com";
const SECRET = "s3cr3t-gateway-token-do-not-leak";

/** Stand-in for the browser: same-origin, no credential of its own. */
function browserRequest(path: string, init?: RequestInit): Request {
  return new Request(`https://apicostguard.example${path}`, init);
}

/** Captures what the proxy actually sent to the origin. */
function recordingFetch(response: Response | (() => Response | Promise<Response>)) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return typeof response === "function" ? response() : response;
  }) as typeof fetch;
  return { calls, fetchFn };
}

const okResponse = () => new Response(JSON.stringify({ status: "ok" }), { status: 200 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("upstreamPathFor", () => {
  /**
   * Every path the frontend actually requests (src/services/api.ts), plus the
   * two public routes. Verified against both shapes a Vercel runtime may
   * expose: the original request path, and the rewrite destination plus the
   * injected `?path=`.
   */
  const cases: Array<[pathname: string, pathParam: string | null, expected: string]> = [
    ["/api/settings", null, "/api/settings"],
    ["/api/history", null, "/api/history"],
    ["/api/dashboard", null, "/api/dashboard"],
    ["/api/analytics", null, "/api/analytics"],
    ["/api/budget", null, "/api/budget"],
    ["/api/budgets", null, "/api/budgets"],
    ["/api/budgets/b-12", null, "/api/budgets/b-12"],
    ["/api/usage/daily-summary", null, "/api/usage/daily-summary"],
    ["/api/providers", null, "/api/providers"],
    ["/api/providers/openrouter/key", null, "/api/providers/openrouter/key"],
    ["/api/providers/openrouter/test", null, "/api/providers/openrouter/test"],
    ["/api/providers/openrouter/validate", null, "/api/providers/openrouter/validate"],
    ["/api/notifications", null, "/api/notifications"],
    ["/api/notifications/send", null, "/api/notifications/send"],
    // The public router serves these without the /api prefix.
    ["/health", null, "/health"],
    ["/version", null, "/version"],
    ["/api", "settings", "/api/settings"],
    ["/api", "history", "/api/history"],
    ["/api", "usage/daily-summary", "/api/usage/daily-summary"],
    ["/api", "health", "/health"],
    ["/api", "version", "/version"],
    // Trailing slashes must not produce a different route.
    ["/api/settings/", null, "/api/settings"],
    ["/api/", "settings", "/api/settings"],
  ];

  it.each(cases)("maps %s (path=%s) to %s", (pathname, pathParam, expected) => {
    expect(upstreamPathFor(pathname, pathParam)).toBe(expected);
  });

  it("rejects paths that match no backend route", () => {
    expect(upstreamPathFor("/", null)).toBeNull();
    expect(upstreamPathFor("/api", null)).toBeNull();
    expect(upstreamPathFor("/api", "")).toBeNull();
    expect(upstreamPathFor("/apixyz", null)).toBeNull();
    expect(upstreamPathFor("/admin/delete-everything", null)).toBeNull();
  });

  /**
   * The gateway routes (backend/src/gateway/mod.rs) are the ones that spend
   * real money on upstream LLM calls, and they are NOT namespaced under /api.
   * vercel.json only rewrites /api/*, /health and /version, and this mapping
   * refuses anything else -- so they stay unreachable through the proxy even
   * if someone later widens the rewrites.
   */
  it("structurally refuses the spend-at-the-origin gateway routes", () => {
    // vercel.json only rewrites /api/*, /health and /version, so these never
    // reach the function at all (also asserted end-to-end in the harness).
    expect(upstreamPathFor("/proxy", null)).toBeNull();
    expect(upstreamPathFor("/v1/chat/completions", null)).toBeNull();
    expect(upstreamPathFor("/v1/generate", null)).toBeNull();
    // Anything smuggled through /api gets namespaced, so it can only ever hit
    // /api/proxy and /api/v1/... - neither of which the backend serves - never
    // the real money-spending /proxy and /v1/... routes.
    expect(upstreamPathFor("/api", "proxy")).toBe("/api/proxy");
    expect(upstreamPathFor("/api", "v1/chat/completions")).toBe("/api/v1/chat/completions");
  });
});

describe("cleanSearch", () => {
  it("drops Vercel's injected path parameter", () => {
    expect(cleanSearch(new URLSearchParams("path=history&limit=100"))).toBe("?limit=100");
  });

  it("keeps a query string untouched when there is no path parameter", () => {
    expect(cleanSearch(new URLSearchParams("limit=1000&provider=openrouter"))).toBe(
      "?limit=1000&provider=openrouter"
    );
  });

  it("returns an empty string when nothing is left", () => {
    expect(cleanSearch(new URLSearchParams(""))).toBe("");
    expect(cleanSearch(new URLSearchParams("path=settings"))).toBe("");
  });
});

describe("buildTargetUrl", () => {
  it("resolves a normal path against the configured origin", () => {
    expect(buildTargetUrl(ORIGIN, "/api/history", "?limit=1000")?.toString()).toBe(
      `${ORIGIN}/api/history?limit=1000`
    );
  });

  it("refuses to leave the configured origin", () => {
    expect(buildTargetUrl(ORIGIN, "//evil.example/steal", "")).toBeNull();
    expect(buildTargetUrl(ORIGIN, "https://evil.example/steal", "")).toBeNull();
    expect(buildTargetUrl(ORIGIN, "/\\evil.example", "")).toBeNull();
    expect(buildTargetUrl(ORIGIN, "api/history", "")).toBeNull();
    expect(buildTargetUrl(ORIGIN, "", "")).toBeNull();
  });

  it("refuses to resolve at all when unconfigured", () => {
    expect(buildTargetUrl("", "/api/settings", "")).toBeNull();
  });
});

describe("parseRequestUrl", () => {
  it("reads an absolute URL", () => {
    expect(parseRequestUrl("https://site.test/api/history?limit=10").pathname).toBe("/api/history");
  });

  it("reads the relative URL some runtimes hand the function", () => {
    const url = parseRequestUrl("/api/history?limit=10&path=history");
    expect(url.pathname).toBe("/api/history");
    expect(url.searchParams.get("path")).toBe("history");
  });
});

describe("header filtering", () => {
  it("strips caller credentials and connection-specific headers", () => {
    const headers = filterRequestHeaders(
      new Headers({
        authorization: "Bearer client-supplied",
        cookie: "session=abc",
        origin: "https://evil.example",
        referer: "https://evil.example/x",
        host: "evil.example",
        "x-forwarded-for": "1.2.3.4",
        connection: "keep-alive",
        "content-type": "application/json",
        accept: "application/json",
      })
    );

    for (const name of [
      "authorization",
      "cookie",
      "origin",
      "referer",
      "host",
      "x-forwarded-for",
      "connection",
    ]) {
      expect(headers.has(name)).toBe(false);
    }
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("strips origin-controlled response headers", () => {
    const headers = filterResponseHeaders(
      new Headers({
        "access-control-allow-origin": "https://evil.example",
        "access-control-allow-credentials": "true",
        "set-cookie": "session=abc",
        location: "https://evil.example/phish",
        "strict-transport-security": "max-age=31536000",
        "content-length": "42",
        "content-encoding": "gzip",
        "content-type": "application/json",
      })
    );

    for (const name of [
      "access-control-allow-origin",
      "access-control-allow-credentials",
      "set-cookie",
      "location",
      "strict-transport-security",
      "content-length",
      "content-encoding",
    ]) {
      expect(headers.has(name)).toBe(false);
    }
    expect(headers.get("content-type")).toBe("application/json");
  });
});

describe("handleProxyRequest", () => {
  it("injects the server-side token and forwards the request", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${ORIGIN}/api/settings`);
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe(`Bearer ${SECRET}`);
    expect(calls[0].init?.method).toBe("GET");
  });

  it("discards a caller-supplied Authorization header", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    await handleProxyRequest(
      browserRequest("/api/settings", {
        headers: { authorization: "Bearer attacker-token" },
      }),
      { upstreamOrigin: ORIGIN, gatewayToken: SECRET, fetchFn }
    );

    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe(`Bearer ${SECRET}`);
  });

  it("preserves the query string and drops the injected path parameter", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    await handleProxyRequest(browserRequest("/api/history?limit=1000&path=history"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(calls[0].url).toBe(`${ORIGIN}/api/history?limit=1000`);
  });

  it("routes the public health check without the /api prefix", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    await handleProxyRequest(browserRequest("/health"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(calls[0].url).toBe(`${ORIGIN}/health`);
  });

  it("forwards a request body for mutations", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    await handleProxyRequest(
      browserRequest("/api/budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      }),
      { upstreamOrigin: ORIGIN, gatewayToken: SECRET, fetchFn }
    );

    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].url).toBe(`${ORIGIN}/api/budgets`);
  });

  it("refuses methods outside the allowlist", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    const response = await handleProxyRequest(browserRequest("/api/settings", { method: "OPTIONS" }), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe(ALLOWED_METHODS.join(", "));
    expect(calls).toHaveLength(0);
  });

  it("fails closed when the server-side origin is missing", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: "",
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.status).toBe(500);
    expect(calls).toHaveLength(0);
  });

  it("returns 404 for a path the backend does not serve", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    const response = await handleProxyRequest(browserRequest("/admin/shutdown"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("rejects oversized bodies before forwarding them", async () => {
    const { calls, fetchFn } = recordingFetch(okResponse());

    const response = await handleProxyRequest(
      browserRequest("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "99999999" },
        body: "{}",
      }),
      { upstreamOrigin: ORIGIN, gatewayToken: SECRET, fetchFn, maxBodyBytes: 1024 }
    );

    expect(response.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it("maps a network failure to 502 without leaking the secret or the origin", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchFn = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(ORIGIN);
    expect(text).not.toContain("onrender.com");
  });

  it("maps an aborted upstream call to 504", async () => {
    const fetchFn = ((_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("This operation was aborted", "AbortError"))
        );
      })) as typeof fetch;

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
      timeoutMs: 5,
    });

    expect(response.status).toBe(504);
    expect(await response.text()).not.toContain(SECRET);
  });

  it("passes an origin 401 through unchanged", async () => {
    const unauthorized = () =>
      new Response(JSON.stringify({ error: { code: "unauthorized", message: "missing or invalid bearer token" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    const { fetchFn } = recordingFetch(unauthorized);

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: "",
      fetchFn,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "missing or invalid bearer token" },
    });
  });

  it("does not relay an origin redirect", async () => {
    const redirect = () =>
      new Response(null, { status: 302, headers: { location: "https://evil.example/phish" } });
    const { fetchFn } = recordingFetch(redirect);

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).not.toContain("evil.example");
  });

  it("never echoes the origin's CORS or cookie headers", async () => {
    const withOriginHeaders = () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "https://evil.example",
          "access-control-allow-credentials": "true",
          "set-cookie": "session=abc",
        },
      });
    const { fetchFn } = recordingFetch(withOriginHeaders);

    const response = await handleProxyRequest(browserRequest("/api/settings"), {
      upstreamOrigin: ORIGIN,
      gatewayToken: SECRET,
      fetchFn,
    });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    // Authenticated API responses stay out of shared caches.
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("never includes the token in a response body", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    const responses = await Promise.all(
      [
        { upstreamOrigin: "", gatewayToken: SECRET },
        { upstreamOrigin: ORIGIN, gatewayToken: SECRET, fetchFn: failing },
      ].map((config) =>
        handleProxyRequest(browserRequest("/api/settings"), {
          ...config,
          fetchFn: config.fetchFn ?? failing,
        })
      )
    );

    for (const response of responses) {
      expect(await response.text()).not.toContain(SECRET);
    }
  });
});
