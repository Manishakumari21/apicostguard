import { defineConfig, Plugin, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Three build modes, three accepted shapes for VITE_API_BASE_URL. The point is
 * that no supported build can ever produce a bundle that both skips the
 * serverless proxy and points at the protected backend.
 *
 *   web      -> `npm run build` (Vercel). Must be empty, so the browser calls
 *               the same-origin /api proxy. The gateway token stays server-side.
 *   desktop  -> `npm run build:desktop` (Tauri). Absolute http(s) URL, or unset
 *               to fall back to the bundled sidecar at localhost:8080.
 *   anything -> refused, so a stray `vite build` cannot pick a default.
 *
 * VITE_API_TOKEN is refused in every mode: the gateway token is a server-side
 * secret and compiling it into a bundle would publish it.
 */
function assertSafeApiConfig(
  apiUrl: string | undefined,
  clientToken: string | undefined,
  mode: string
): void {
  if (clientToken !== undefined && clientToken.trim() !== "") {
    throw new Error(
      "[apicostguard] VITE_API_TOKEN must never be set. The gateway token is a server-side secret " +
        "injected by the Vercel proxy (api/index.ts) -- remove it from Vercel and from every local .env file."
    );
  }

  if (mode === "web") {
    if (apiUrl !== undefined && apiUrl !== "") {
      throw new Error(
        "[apicostguard] VITE_API_BASE_URL must be empty for web builds so the browser calls the " +
          "same-origin /api proxy instead of the protected backend directly. Delete " +
          "VITE_API_BASE_URL from Vercel -> Project Settings -> Environment Variables; " +
          "the committed .env.web already supplies the correct value."
      );
    }
    return;
  }

  if (mode === "desktop") {
    if (apiUrl === undefined || apiUrl === "") return;
    if (!/^https?:\/\//i.test(apiUrl)) {
      throw new Error(
        "[apicostguard] VITE_API_BASE_URL must be an absolute http(s) URL for desktop builds."
      );
    }
    return;
  }

  throw new Error(
    `[apicostguard] Refusing to build with mode "${mode}". ` +
      "Use `npm run build` for the web deployment or `npm run build:desktop` for Tauri."
  );
}

function apiBaseUrlGuard(apiUrl: string | undefined, clientToken: string | undefined, mode: string): Plugin {
  return {
    name: "api-base-url-guard",
    configResolved(config) {
      if (config.command !== "build") return;
      assertSafeApiConfig(apiUrl, clientToken, mode);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // `??` rather than `||` so an explicitly empty value is respected: empty is
  // the correct web configuration, not a missing one.
  const apiUrl = process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL;
  const clientToken = process.env.VITE_API_TOKEN ?? env.VITE_API_TOKEN;

  return {
    plugins: [apiBaseUrlGuard(apiUrl, clientToken, mode), react()],
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: true,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
    build: {
      target: "es2022",
    },
  };
});
