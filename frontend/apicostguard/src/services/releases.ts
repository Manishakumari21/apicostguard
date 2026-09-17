import { GITHUB_REPO_PATH } from "../config/app";

export type PlatformId = "windows" | "macos" | "linux";

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
  platform: PlatformId;
}

export interface LatestRelease {
  tagName: string;
  version: string;
  name: string;
  publishedAt: string;
  body: string;
  assets: ReleaseAsset[];
}

const LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO_PATH}/releases/latest`;

function platformForAsset(name: string): PlatformId | null {
  const lower = name.toLowerCase();
  if (/\.(exe|msi)$/.test(lower)) return "windows";
  if (/\.(dmg|pkg)$/.test(lower) || lower.includes(".app.tar.gz")) return "macos";
  if (/\.(appimage|deb|rpm)$/.test(lower)) return "linux";
  return null;
}

export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(LATEST_RELEASE_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;

    const json = (await res.json()) as {
      tag_name?: string;
      name?: string;
      published_at?: string;
      body?: string | null;
      assets?: Array<{
        name: string;
        browser_download_url: string;
        size: number;
      }>;
    };

    const assets: ReleaseAsset[] = (json.assets ?? [])
      .map((a) => ({
        name: a.name,
        url: a.browser_download_url,
        size: a.size,
        platform: platformForAsset(a.name),
      }))
      .filter((a): a is ReleaseAsset => a.platform !== null);

    return {
      tagName: json.tag_name ?? "",
      version: (json.tag_name ?? "").replace(/^v/, ""),
      name: json.name ?? json.tag_name ?? "Release",
      publishedAt: json.published_at ?? "",
      body: json.body ?? "",
      assets,
    };
  } catch {
    return null;
  }
}