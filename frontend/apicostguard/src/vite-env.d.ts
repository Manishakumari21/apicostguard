/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL for backend calls. Empty means same-origin (the serverless
   * proxy). There is deliberately no `VITE_API_TOKEN`: a `VITE_*` value is
   * compiled into the public bundle, and the build refuses to run if one is
   * present.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __TAURI_INTERNALS__?: unknown;
}
