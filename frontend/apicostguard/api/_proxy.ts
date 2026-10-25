/**
 * Server-side proxy between the browser and the APICostGuard backend.
 *
 * Why this exists: `APICOSTGUARD_GATEWAY_TOKEN` is a server-side secret.
 * Compiling it into the client bundle would publish it to everyone who loads
 * the page, so the browser never talks to the protected origin directly. It
 * calls this same-origin proxy instead, and the proxy injects the bearer token
 * on the way out. The token is read from `process.env` in `index.ts` and is
 * never returned in a body, a header, or a log line.
 *
 * The `_` prefix marks this file as a utility: Vercel deploys only
 * `api/index.ts` as a function and never turns `_proxy.ts` into a route.
 *
 * Nothing in this module performs I/O at module scope, so every rule below is
 * unit-tested without a Vercel runtime.
 */

/** HTTP methods the proxy will forward. Anything else is rejected with 405. */
export const ALLOWED_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] as const;

/** Upper bound for a request body, mirroring the backend's 1 MiB guard. */
export const MAX_BODY_BYTES = 1_048_576;

/**
 * Give up on the origin before the browser's 9 s client timeout
 * (`REQUEST_TIMEOUT_MS` in `src/services/client.ts`), so a slow origin turns
 * into a clean 504 JSON body instead of a network error in the UI.
 */
export const UPSTREAM_TIMEOUT_MS = 8_000;

/**
 * Backend routes that are NOT namespaced under `/api`. Mirrors the `public`
 * router in `backend/src/api/routes.rs`; keep the two in sync.
 */
const UNNAMESPACED_ROUTES = new Set(["health", "version"]);

/**
 * The query parameter Vercel injects when a rewrite uses a `:path*` capture.
 * No backend route reads a parameter by this name, so dropping it is safe.
 */
const REWRITE_PATH_PARAM = "path";

/** Caller-specific and hop-by-hop headers that must never reach the origin. */
const REQUEST_HEADERS_TO_STRIP = [
  // Always discard the caller's credential: we inject the proxy's own below,
  // and a browser-supplied token must never be able to override it.
  "authorization",
  // Browser identity and session state do not cross the origin boundary.
  "cookie",
  "host",
  "origin",
  "referer",
  // Hop-by-hop headers describe a single connection.
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  // Recomputed by the runtime from the body we forward.
  "content-length",
  // Let the runtime negotiate an encoding it can definitely decode.
  "accept-encoding",
  // Spoofable routing metadata: the origin should see this proxy, not the client.
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
];

/** Origin-controlled headers that must not be relayed onto our hostname. */
const RESPONSE_HEADERS_TO_STRIP = [
  // Hop-by-hop.
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  // Recomputed by the runtime for the body it actually sends.
  "content-length",
  "content-encoding",
  // The origin's CORS policy governs the origin's domain, not this proxy's.
  // Dropping these keeps the proxy response readable only same-origin, which
  // is stricter than echoing them would be.
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-expose-headers",
  "access-control-max-age",
  // Never relay origin cookies, redirects or transport policy to our domain.
  "set-cookie",
  "set-cookie2",
  "location",
  "strict-transport-security",
];

function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  }
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers });
}

/** Copy of `source` without anything that only makes sense on one hop. */
export function filterRequestHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const name of REQUEST_HEADERS_TO_STRIP) headers.delete(name);
  return headers;
}

/** Copy of `source` without origin-controlled or hop-by-hop headers. */
export function filterResponseHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const name of RESPONSE_HEADERS_TO_STRIP) headers.delete(name);
  // Catch the `access-control-*` family generically rather than by listing it.
  for (const name of Array.from(headers.keys())) {
    if (name.startsWith("access-control-")) headers.delete(name);
  }
  return headers;
}

/**
 * Vercel may hand the function a relative URL (e.g. `/api/history?path=history`)
 * rather than an absolute one, which makes `new URL(raw)` throw. Fall back to a
 * placeholder base so the pathname and query stay readable either way.
 */
export function parseRequestUrl(raw: string): URL {
  try {
    return new URL(raw);
  } catch {
    return new URL(raw, "http://proxy.invalid");
  }
}

function trimTrailingSlashes(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Map a `/api/*` tail onto the path the backend actually serves. */
function namespacedPath(tail: string): string | null {
  const clean = tail.replace(/^\/+/, "");
  if (!clean) return null;
  return UNNAMESPACED_ROUTES.has(clean) ? `/${clean}` : `/api/${clean}`;
}

/**
 * Map the path the proxy received onto the path the backend expects.
 * Returns `null` when the path matches no backend route.
 *
 * Two shapes must both work, because Vercel runtimes differ in which one they
 * expose in `request.url` after a rewrite:
 *
 *   1. the original request path - `/api/history`, `/health`
 *   2. the rewrite destination    - `/api` plus the injected `?path=history`
 *
 * Both shapes resolve to the same upstream path, so the handler is correct
 * whichever the runtime provides.
 */
export function upstreamPathFor(
  pathname: string,
  pathParam: string | null | undefined
): string | null {
  const path = trimTrailingSlashes(pathname);

  if (path.startsWith("/api/")) return namespacedPath(path.slice("/api/".length));
  if (path === "/api") {
    const captured = (pathParam ?? "").replace(/^\/+/, "");
    return captured ? namespacedPath(captured) : null;
  }

  // Reached for the `/health` and `/version` rewrites, which carry no capture
  // of their own when the runtime preserves the original path.
  const bare = path.replace(/^\//, "");
  return UNNAMESPACED_ROUTES.has(bare) ? `/${bare}` : null;
}

/** Preserve the caller's query string but drop Vercel's injected `?path=`. */
export function cleanSearch(params: URLSearchParams): string {
  const copy = new URLSearchParams(params);
  copy.delete(REWRITE_PATH_PARAM);
  const query = copy.toString();
  return query ? `?${query}` : "";
}

/**
 * Resolve the absolute upstream URL for a request.
 *
 * Returns `null` for anything that would leave `origin`: protocol-relative
 * (`//other-host/...`), absolute (`https://other-host/...`), or a missing
 * leading slash. The final `origin` comparison is the real guard: a path can
 * never legitimately change the origin it resolves against.
 */
export function buildTargetUrl(origin: string, pathname: string, search: string): URL | null {
  if (!origin) return null;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  // Control characters are handled by URL parsing itself.

  let target: URL;
  try {
    target = new URL(`${pathname}${search}`, origin);
  } catch {
    return null;
  }
  return target.origin === origin ? target : null;
}

export interface ProxyConfig {
  /** `URL.origin` of the backend, or `""` when the proxy is unconfigured. */
  upstreamOrigin: string;
  /** Server-side gateway token. Never sourced from the request. */
  gatewayToken?: string;
  timeoutMs?: number;
  maxBodyBytes?: number;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
}

let warnedMissingToken = false;

/**
 * Forward one request to the backend, injecting the gateway token and mapping
 * every failure to a JSON body that is safe to hand to the browser.
 */
export async function handleProxyRequest(
  request: Request,
  config: ProxyConfig
): Promise<Response> {
  const method = (request.method ?? "GET").toUpperCase();

  if (!(ALLOWED_METHODS as readonly string[]).includes(method)) {
    return jsonError(405, "method_not_allowed", "That method is not supported here.", {
      allow: ALLOWED_METHODS.join(", "),
    });
  }

  // Fail closed when the server-side origin is missing or unusable. The
  // message stays generic so nothing about the deployment is disclosed.
  if (!config.upstreamOrigin) {
    return jsonError(500, "proxy_misconfigured", "The API proxy is not configured.");
  }

  const url = parseRequestUrl(request.url);
  const upstreamPath = upstreamPathFor(url.pathname, url.searchParams.get(REWRITE_PATH_PARAM));
  if (!upstreamPath) {
    return jsonError(404, "not_found", "Unknown API path.");
  }

  const target = buildTargetUrl(config.upstreamOrigin, upstreamPath, cleanSearch(url.searchParams));
  if (!target) {
    return jsonError(400, "bad_request", "Invalid request path.");
  }

  const maxBodyBytes = config.maxBodyBytes ?? MAX_BODY_BYTES;
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    // Reject on the declared length first so oversized bodies are not buffered.
    const declared = Number(request.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > maxBodyBytes) {
      return jsonError(413, "payload_too_large", "Request body is too large.");
    }
    body = await request.arrayBuffer();
    if (body.byteLength > maxBodyBytes) {
      return jsonError(413, "payload_too_large", "Request body is too large.");
    }
    if (body.byteLength === 0) body = undefined;
  }

  const headers = filterRequestHeaders(request.headers);
  const token = config.gatewayToken?.trim();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  } else if (!warnedMissingToken) {
    // Logs the absence of the secret, never the secret itself.
    warnedMissingToken = true;
    console.error(
      "[apicostguard-proxy] APICOSTGUARD_GATEWAY_TOKEN is not set on the server; the origin will reject protected routes."
    );
  }

  const timeoutMs = config.timeoutMs ?? UPSTREAM_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let upstream: Response;
  try {
    const fetchFn = config.fetchFn ?? fetch;
    upstream = await fetchFn(target.toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
      // Never follow the origin elsewhere: that would turn the proxy into an
      // open redirect and hide where the response really came from.
      redirect: "manual",
    });
  } catch {
    if (controller.signal.aborted) {
      return jsonError(504, "upstream_timeout", "The backend did not respond in time.");
    }
    return jsonError(502, "upstream_unreachable", "The backend could not be reached.");
  } finally {
    clearTimeout(timer);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    void upstream.body?.cancel().catch(() => undefined);
    return jsonError(502, "upstream_redirect", "The backend returned an unexpected redirect.");
  }

  const responseHeaders = filterResponseHeaders(upstream.headers);
  // API responses are per-viewer and authenticated; keep them out of caches
  // unless the origin explicitly opted in.
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("cache-control", "no-store");
  }

  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
