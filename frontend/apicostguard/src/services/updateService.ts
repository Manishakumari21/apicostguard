import { check, type Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "installing"
  | "unable";

export interface UpdateCheckResult {
  status: UpdateStatus;
  availableVersion?: string;
  message?: string;
  update?: Update;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const update = await check({ timeout: 15000 });
    if (update) {
      return {
        status: "available",
        availableVersion: update.version,
        message: `Version ${update.version} is available.`,
        update,
      };
    }
    return { status: "up-to-date", message: "You're up to date." };
  } catch (err) {
    return {
      status: "unable",
      message:
        err instanceof Error
          ? err.message
          : "No published release found yet — or the update feed is unreachable.",
    };
  }
}

export async function installUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall();
}