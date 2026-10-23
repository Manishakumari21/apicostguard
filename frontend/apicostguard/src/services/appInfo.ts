import type { AppInfo } from "../types/domain";
import { tauriInvoke } from "./tauri";

function guessBrowserAppInfo(): AppInfo {
  const ua = navigator.userAgent;
  const platform = /Windows/i.test(ua)
    ? "windows"
    : /Mac/i.test(ua)
      ? "macos"
      : /Linux/i.test(ua)
        ? "linux"
        : "unknown";
  const arch = /arm64|aarch64|Apple A|arm;/i.test(ua) ? "aarch64" : /x64|WOW64|x86_64/i.test(ua) ? "x86_64" : "unknown";
  return { name: "APICostGuard", version: "dev", platform, arch };
}

export async function getAppInfo(): Promise<AppInfo> {
  try {
    return await tauriInvoke<AppInfo>("app_info");
  } catch {
    return guessBrowserAppInfo();
  }
}