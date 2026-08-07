/**
 * Dev workflow: rebuild dist/ on change, and serve it over CORS on port 4400
 * so Penpot's plugin manager can load http://localhost:4400/manifest.json.
 *
 * This replaces `vite-live-preview`, which injects its client <script> into the
 * HTML response without updating Content-Length. The body is then truncated by
 * exactly the injected length, which silently cuts the tail off index.html —
 * the last element loses its attributes and the UI fails to boot. Both 0.3.x
 * and 0.4.x do it. `vite preview` serves the built files byte-for-byte.
 *
 * Trade-off: no automatic browser reload. After a rebuild, reopen the plugin in
 * Penpot (changes to plugin.js need that anyway).
 */
import { spawn } from "node:child_process";

const children = [];

function run(label, args) {
  const child = spawn("npx", ["vite", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  child.on("exit", (code, signal) => {
    if (signal) return; // we're shutting down
    console.error(`\n[dev] ${label} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// --sourcemap keeps the dev-only sourcemaps the old setup provided, without
// emitting them from `npm run build`.
run("build --watch", ["build", "--watch", "--sourcemap"]);
run("preview", ["preview"]);
