/**
 * The message protocol between the plugin UI (iframe, src/main.ts) and the
 * Penpot sandbox (src/plugin.ts).
 *
 * This is deliberately a `.d.ts`: it must never become a runtime module. Both
 * build entries import it, and if it emitted any JavaScript, Rollup would hoist
 * it into a shared chunk that dist/plugin.js would then `import` — which the
 * Penpot sandbox cannot do. As a `.d.ts` it holds no values to emit, and an
 * accidental value import fails the build loudly instead of silently breaking
 * at runtime. `scripts/verify-plugin-bundle.mjs` is the backstop.
 */

/** Rendering parameters chosen in the UI, applied to the inserted icon. */
export interface IconParams {
  /** Rendered size in px. The SVG keeps a 24x24 viewBox and is scaled to this. */
  size: number;
  /**
   * Stroke width in lucide user units on the 24-unit grid — not pixels.
   * This is lucide's own definition, so a given value looks identical at any
   * size. Default 2, sensible range 0.5–4.
   */
  strokeWidth: number;
}

export type UiToPlugin = {
  type: "insert-icon";
  /** Icon name, e.g. "arrow-up-right". Becomes the shape name in Penpot. */
  name: string;
  /** Fully-resolved SVG markup, built in the UI so plugin.ts shares no code. */
  svg: string;
  /** Rides along only so the plugin can size-check without re-parsing the SVG. */
  params: IconParams;
};

export type PluginToUi =
  | { source: "penpot"; type: "themechange"; theme: string }
  | { source: "penpot"; type: "insert-result"; ok: true; name: string }
  | { source: "penpot"; type: "insert-result"; ok: false; name: string; error: string };
