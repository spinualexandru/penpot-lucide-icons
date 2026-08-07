/**
 * Guards the one build invariant this project cannot violate.
 *
 * `dist/plugin.js` is evaluated directly by Penpot's sandbox, not loaded as an
 * ES module with a resolver behind it. If `src/plugin.ts` ever shares a runtime
 * module with `src/main.ts`, Rollup hoists that module into a shared chunk and
 * emits an `import` into plugin.js — which breaks the plugin at runtime, inside
 * Penpot, with no useful error. Failing the build here is much cheaper.
 *
 * Only `import type` may cross between the two entries (it is erased before
 * Rollup ever builds a module graph).
 */
import { readFileSync } from "node:fs";

const FILE = "dist/plugin.js";

let source;
try {
  source = readFileSync(FILE, "utf8");
} catch {
  console.error(`FAIL: ${FILE} not found — run the build first.`);
  process.exit(1);
}

// Static `import x from "…"` / `import "…"`, bare `from "…"`, and dynamic `import(`.
// The leading guard avoids matching property accesses like `foo.import`.
const IMPORT_RE = /(^|[^.\w$])(import\s*[({"'`]|from\s*["'`])/;

const match = IMPORT_RE.exec(source);
if (match) {
  const at = Math.max(0, match.index - 60);
  console.error(`FAIL: ${FILE} contains an import — the sandbox bundle is not self-contained.`);
  console.error(`  near: …${source.slice(at, match.index + 120)}…`);
  console.error(`  Something in src/plugin.ts now shares a runtime module with the UI entry.`);
  process.exit(1);
}

console.log(`OK: ${FILE} is self-contained (${source.length} bytes)`);
