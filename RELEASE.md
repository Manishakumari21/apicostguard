# Publishing Releases of APICostGuard

APICostGuard ships desktop installers through **GitHub Releases** and checks for
updates in-app through the **Tauri updater**. This document explains the entire
pipeline: signing keys, GitHub secrets, tagging, and what the automation does.

```
code  →  build  →  signing key  →  GitHub secrets  →  push tag
   →  GitHub Actions  →  installers + latest.json  →  GitHub Release
   →  users download or update in-app
```

> **First-release reality:** there are currently **zero published releases**, so
> the in-app "Check for updates" honestly reports no update, and the Download
> section shows "No public releases yet". Everything below is how you publish
> the first one — after that, downloads and updates work automatically.

---

## 1. The pieces

| Piece               | Where it lives                                                        |
| ------------------- | --------------------------------------------------------------------- |
| Tauri app           | `frontend/apicostguard` (Rust in `src-tauri`, UI in `src`)            |
| Sidecar gateway     | `backend` (separate Rust binary bundled as `externalBin`)             |
| Update feed         | `https://github.com/Manishakumari21/apicostguard/releases/latest/download/latest.json` |
| Updater endpoint    | `frontend/apicostguard/src-tauri/tauri.conf.json` → `plugins.updater` |
| Release automation  | `.github/workflows/release.yml`                                        |

---

## 2. Create a signing key (one-time, your machine)

The Tauri updater signs every update bundle. You need an **minisign** keypair:

```bash
cd frontend/apicostguard
npm run tauri signer generate -- -w ~/.tauri/apicostguard.key
```

- Enter a **password** when prompted (or press Enter for an unencrypted key).
- The command prints the **public key** and writes:
  - `~/.tauri/apicostguard.key` — **PRIVATE KEY, treat as a secret**
  - `~/.tauri/apicostguard.key.pub` — public key, safe to share

### Public key goes into the app config

Open `frontend/apicostguard/src-tauri/tauri.conf.json` and add the public key to
the updater plugin so the app verifies update signatures:

```json
"plugins": {
  "updater": {
    "endpoints": ["https://github.com/Manishakumari21/apicostguard/releases/latest/download/latest.json"],
    "pubkey": "PASTE_THE_PUBLIC_KEY_HERE"
  }
}
```

> If `pubkey` is omitted the app still updates, but updates are **not
> signature-verified**. Add it for production.

---

## 3. Where the private key must be stored

- **Never commit it.** The root `.gitignore` already ignores `*.key`, `*.enc`,
  and `*.local` — keep the key outside the repo (e.g. `~/.tauri/`).
- Sidecar binaries and Node/Rust build output are also git-ignored.
- The private key content goes into GitHub as a **repository secret** (below),
  so GitHub Actions can sign artifacts without ever seeing it in the repo.

---

## 4. GitHub Secrets to create

In the repository settings → **Settings → Secrets and variables → Actions →
New repository secret**:

| Secret                              | Value                                                        |
| ----------------------------------- | ------------------------------------------------------------ |
| `TAURI_SIGNING_PRIVATE_KEY`         | Full contents of `~/.tauri/apicostguard.key` (the whole file, including `-----BEGIN...-----` lines and newlines) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`| The password you chose (empty if you created an unencrypted key) |

Optional, for signed+notarized macOS distribution:

| Secret                     | Value                             |
| -------------------------- | --------------------------------- |
| `APPLE_CERTIFICATE`        | Base64 of your `.p12` cert        |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password            |
| `APPLE_SIGNING_IDENTITY`   | e.g. `Developer ID Application: You` |
| `APPLE_ID` / `APPLE_PASSWORD` | Developer account + app-specific password (notarization) |
| `APPLE_TEAM_ID`            | Your team id                      |

`GITHUB_TOKEN` is provided automatically by GitHub.

---

## 5. Keeping versions consistent

All of these must agree on the version you're releasing (currently `0.1.0`):

- `frontend/apicostguard/package.json` → `version`
- `frontend/apicostguard/src-tauri/Cargo.toml` → `[package] version`
- `frontend/apicostguard/src-tauri/tauri.conf.json` → `version`
- the Git tag → `v<same>` (workflow triggers on `v*`)

Bump them together before tagging.

---

## 6. Publish the first release

1. Make sure the version is bumped in the three files above.
2. Commit and push:
   ```bash
   git add -A
   git commit -m "Release v0.1.0"
   git push
   ```
3. Create and push the tag:
   ```bash
   git tag -a v0.1.0 -m "APICostGuard v0.1.0"
   git push origin v0.1.0
   ```
4. Open **Actions** in the repo — the `Release` workflow starts. It:
   - builds the sidecar gateway and the Tauri app on `ubuntu-22.04`, `windows-latest`, and `macos-latest` (aarch64 + x86_64),
   - signs bundles with `TAURI_SIGNING_PRIVATE_KEY`,
   - uploads a **draft GitHub Release** named `v0.1.0` with the installers and the updater feed `latest.json`.
5. When all matrix legs finish, go to the **Releases** page, review the draft,
   then click **Publish release**.

### What the release contains

| Platform | Artifacts (Tauri chooses exact names)                           |
| -------- | -------------------------------------------------------------- |
| Linux    | `.AppImage`, `.deb`, and the sidecar `.AppImage` bundles        |
| Windows  | NSIS installer `.exe` and the sidecar `.exe`                    |
| macOS    | `.dmg`, `.app.tar.gz`, and the sidecar `.app.tar.gz`            |
| All      | `latest.json` (the Tauri updater feed)                          |

---

## 7. How the Tauri updater works

- The app asks the configured **endpoint** for `latest.json` when you press
  **Check for updates** (Settings → About).
- `latest.json` maps the installed platform/arch to the newest signed bundle.
- If the published version is newer than the installed one, the UI shows
  **Install Update**; the plugin downloads, verifies the signature, and installs.
- If there is **no release, no feed, no network, or the app can't reach the
  endpoint**, the UI shows an honest **"unable to update"** state — it never
  blocks the app from running.

---

## 8. Test an update

1. Publish `v0.1.0` (steps above). Install it or run it locally.
2. Bump the version to `1.0.1` in the three files, commit, tag `v0.1.1`, push.
3. Wait for the workflow + publish the draft release.
4. In the running app open **Settings → About → Check for updates**.
   You should see "Update available — Version 1.0.1 is available." and an
   **Install Update** button.

---

## 9. Local builds (no GitHub)

The frontend's `src-tauri` bundles a sidecar from `bin/`. Build it locally first:

```bash
cargo build --release --target x86_64-unknown-linux-gnu   # Linux
# win/macos: use the appropriate host target triple
mkdir -p frontend/apicostguard/src-tauri/bin
cp backend/target/<target>/release/apicostguard_backend \
   frontend/apicostguard/src-tauri/bin/apicostguard_backend-<target>
```

Then build the app:

```bash
cd frontend/apicostguard
npm run tauri build
```

- **Linux:** produces `.AppImage` + `.deb`.
- **Windows:** XP targets build on Windows (NSIS `.exe`) — MSVC is safest.
- **macOS:** dmg/app bundles build only on macOS (and need Apple's toolchain
  for the `.app.tar.gz` updater bundle).

You generally cannot cross-compile the Windows/macOS bundles from Linux; use the
GitHub Actions workflow for those targets.

---

## 10. Checklist before each release

- [ ] Version bumped in `package.json`, `src-tauri/Cargo.toml`, `tauri.conf.json`
- [ ] `pubkey` set in `tauri.conf.json` if signed updates wanted
- [ ] `TAURI_SIGNING_PRIVATE_KEY` (+ password) secrets exist
- [ ] Tag `vX.Y.Z` pushed; workflow green; draft release published