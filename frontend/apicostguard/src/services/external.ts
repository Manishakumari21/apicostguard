import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "./tauri";

export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}