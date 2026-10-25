import { handleProxyRequest } from "./_proxy";

/**
 * The one Vercel Function behind every `/api/*`, `/health` and `/version`
 * request (see `vercel.json`). `vercel.json` rewrites send those paths here;
 * `./_proxy` holds the routing and safety rules and is not deployed itself.
 *
 * Server-side secrets, read here and nowhere else:
 *
 *   APICOSTGUARD_UPSTREAM_URL   Origin of the Render backend, e.g.
 *                               `https://apicostguard-1.onrender.com`
 *   APICOSTGUARD_GATEWAY_TOKEN  Bearer token injected on the outbound request.
 *                               Must match the value set on Render.
 *
 * Both are read from `process.env` at request time, so they never appear in
 * `import.meta.env`, in the built bundle, in a response, or in a log line.
 */

interface ResolvedOrigin {
  origin: string;
  /** Static reason, safe to log. Never contains the variable's value. */
  problem: string | null;
}

function resolveUpstreamOrigin(): ResolvedOrigin {
  const raw = process.env.APICOSTGUARD_UPSTREAM_URL?.trim();
  if (!raw) return { origin: "", problem: "APICOSTGUARD_UPSTREAM_URL is not set" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { origin: "", problem: "APICOSTGUARD_UPSTREAM_URL is not a valid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { origin: "", problem: "APICOSTGUARD_UPSTREAM_URL must use http or https" };
  }
  if (url.username || url.password) {
    return { origin: "", problem: "APICOSTGUARD_UPSTREAM_URL must not embed credentials" };
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    return { origin: "", problem: "APICOSTGUARD_UPSTREAM_URL must be an origin without a path" };
  }

  return { origin: url.origin, problem: null };
}

let reportedOriginProblem = false;

function handle(request: Request): Promise<Response> {
  const { origin, problem } = resolveUpstreamOrigin();
  if (problem && !reportedOriginProblem) {
    // Once per isolate: says what is wrong without echoing whatever the
    // variable actually contains.
    reportedOriginProblem = true;
    console.error(`[apicostguard-proxy] ${problem}`);
  }

  return handleProxyRequest(request, {
    upstreamOrigin: origin,
    gatewayToken: process.env.APICOSTGUARD_GATEWAY_TOKEN,
  });
}

/**
 * Vercel accepts either the `fetch` Web Standard export or per-method named
 * exports for a file in `api/`. Both point at the same handler, so the function
 * deploys correctly whichever shape the runtime resolves to.
 */
export default { fetch: handle };

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
