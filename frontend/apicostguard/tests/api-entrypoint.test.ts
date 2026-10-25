import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Regression tests for the Vercel Function entry point.
 *
 * Commit 8862957 shipped `import { handleProxyRequest } from "./_proxy"` —
 * extensionless. Because `package.json` sets `"type": "module"`, Vercel compiles
 * `api/*.ts` to *native* ESM (it does not downgrade to CommonJS) and Node resolves
 * relative specifiers exactly as written. The module therefore failed to load with
 * `ERR_MODULE_NOT_FOUND` at cold start, so the handler never ran and every route
 * into the function returned HTTP 500 `FUNCTION_INVOCATION_FAILED` — including
 * `/health` and `/api/settings`.
 *
 * These tests exist because the obvious test — importing `api/index` from vitest —
 * would NOT have caught it. Vite/vitest use a bundler-style resolver that happily
 * accepts extensionless imports, which is exactly why `tsc --noEmit` and `vite build`
 * both passed while the deployed function was dead. The checks below assert Node's
 * rules explicitly, and the second one goes through a real `tsc` emit followed by a
 * real Node ESM load, i.e. the same two steps the Vercel runtime performs.
 */

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(PROJECT_ROOT, "api");

/** Config is written next to the project so relative `include`/`rootDir` resolve. */
const TSCONFIG = join(PROJECT_ROOT, ".tmp-esm-load.tsconfig.json");

/** Emit output lives in the OS temp dir so a crash cannot dirty the repo. */
let emitDir: string | null = null;

afterAll(() => {
  rmSync(TSCONFIG, { force: true });
  if (emitDir) rmSync(emitDir, { recursive: true, force: true });
});

/** Every `.ts` file that Vercel will compile for the Function. */
function apiSourceFiles(): string[] {
  return readdirSync(API_DIR, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(API_DIR, f));
}

/**
 * Relative module specifiers written in a source file. Matches `import ... from`,
 * `export ... from`, `import("...")` and `require("...")` in one go, because every
 * one of those is resolved by Node at load time.
 */
function relativeSpecifiers(source: string): string[] {
  return [...source.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
}

describe("api entry point follows Node ESM resolution", () => {
  it("gives every relative import an explicit runtime extension", () => {
    const offenders: string[] = [];

    for (const file of apiSourceFiles()) {
      const relFile = file.slice(PROJECT_ROOT.length + 1);
      for (const spec of relativeSpecifiers(readFileSync(file, "utf8"))) {
        // Node only accepts a concrete extension for relative specifiers: an
        // extensionless `./foo` is a fatal ERR_MODULE_NOT_FOUND under native ESM.
        if (!/\.(?:[cm]?js|json)$/.test(spec)) {
          offenders.push(`${relFile}: "${spec}" has no runtime extension`);
          continue;
        }
        // TS maps `./x.js` onto `./x.ts` while type-checking; Node sees the `.js`.
        const resolved = [spec, spec.replace(/\.js$/, ".ts"), spec.replace(/\.cjs$/, ".cts")]
          .map((p) => resolve(dirname(file), p));
        if (!resolved.some(existsSync)) {
          offenders.push(`${relFile}: "${spec}" does not resolve to a file`);
        }
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("still loads as native ESM after a tsc emit, the way the Vercel runtime loads it", () => {
    emitDir = mkdtempSync(join(tmpdir(), "acg-esm-"));

    writeFileSync(
      TSCONFIG,
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            // Mirrors the project's tsconfig: Vercel compiles handlers with it.
            module: "ESNext",
            moduleResolution: "bundler",
            skipLibCheck: true,
            strict: false,
            types: ["node"],
            noEmit: false,
            outDir: emitDir,
            rootDir: "api",
          },
          include: ["api/**/*.ts"],
        },
        null,
        2,
      ),
    );

    const tscBin = join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc");
    execFileSync(process.execPath, [tscBin, "-p", TSCONFIG], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });

    // `package.json` sets `"type": "module"`, so Vercel/Node load the emitted
    // JavaScript as native ESM rather than CommonJS.
    writeFileSync(join(emitDir, "package.json"), JSON.stringify({ type: "module" }));
    writeFileSync(
      join(emitDir, "probe.mjs"),
      [
        `const mod = await import("./index.js");`,
        `const handler = mod.default;`,
        `console.log(JSON.stringify({`,
        `  defaultIsObject: typeof handler === "object" && handler !== null,`,
        `  fetch: typeof handler?.fetch,`,
        `  methods: ["GET","HEAD","POST","PUT","PATCH","DELETE"].filter(`,
        `    (m) => typeof mod[m] === "function"`,
        `  ),`,
        `}));`,
      ].join("\n"),
    );

    const stdout = execFileSync(process.execPath, [join(emitDir, "probe.mjs")], {
      cwd: emitDir,
      stdio: "pipe",
      encoding: "utf8",
    });

    const loaded = JSON.parse(stdout.trim()) as {
      defaultIsObject: boolean;
      fetch: string;
      methods: string[];
    };

    // If the import specifier regressed to extensionless, the child process dies
    // with ERR_MODULE_NOT_FOUND here and execFileSync throws before this runs.
    expect(loaded.defaultIsObject, "export default must be a handler object").toBe(true);
    expect(loaded.fetch, "export default.fetch must be a function").toBe("function");
    expect(loaded.methods).toEqual(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);

    // The emitted entry point must link to a file that actually landed in the
    // output. This is what `./_proxy` failing to resolve would have broken.
    const emitted = readFileSync(join(emitDir, "index.js"), "utf8");
    const emittedImports = relativeSpecifiers(emitted);
    expect(emittedImports.length, "entry point must import something").toBeGreaterThan(0);
    const missing = emittedImports.filter(
      (spec) => !existsSync(resolve(emitDir as string, spec)),
    );
    expect(missing, `unresolved in emitted output: ${missing.join(", ")}`).toEqual([]);
  });
});
