import { defineConfig } from "vite";

export default defineConfig({
  json: {
    // Emit `JSON.parse("…")` rather than a ~1 MB JS object literal — much
    // faster for the engine to parse. Named exports are pointless here anyway:
    // lucide's keys are kebab-case and not valid identifiers.
    stringify: true,
    namedExports: false,
  },
  build: {
    rollupOptions: {
      input: {
        plugin: "src/plugin.ts",
        index: "./index.html",
      },
      output: {
        // plugin.js must keep its exact name — public/manifest.json points at it.
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  preview: {
    port: 4400,
    cors: true,
  },
});
