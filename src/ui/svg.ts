/**
 * Builds SVG markup from lucide icon node data.
 *
 * There are two output modes and the difference between them is the core design
 * decision of this plugin:
 *
 *   Preview (grid tiles) — emits NO width/height/stroke/stroke-width. Those come
 *   from CSS, so changing stroke width is a single custom-property write and
 *   never rebuilds any markup, and the colour simply follows the Penpot theme.
 *   See `.lucide-svg` in style.css.
 *
 *   Export (sent to penpot.createShapeFromSvg) — bakes every value in as a
 *   literal attribute. Penpot has no CSS cascade, so `currentColor` would not
 *   resolve there and the icon would import with a broken stroke.
 */
import type { IconParams } from "../lib/messages";

/**
 * The colour inserted icons are given. Penpot cannot resolve `currentColor`, so
 * this has to be a literal.
 *
 * Deliberately not tied to the plugin's theme: a dark Penpot *UI* does not mean
 * a dark canvas, so following the theme here would drop invisible white icons
 * onto a light board. Black is the safe default, and it is trivially recoloured
 * in Penpot after insertion.
 */
export const INSERT_COLOR = "#000000";

/** A lucide icon primitive. Verified: always a 2-tuple, never nested. */
export type IconNode = [tag: string, attrs: Record<string, string | number>];

// Both sets are exhaustive for lucide-static@1.28.0, confirmed by walking all
// 7032 nodes. They are cheap insurance and they document the verified shape.
const ALLOWED_TAGS = new Set(["path", "circle", "rect", "line", "ellipse", "polyline", "polygon"]);
// prettier-ignore
const ALLOWED_ATTRS = new Set([
  "cx", "cy", "d", "fill", "height", "points", "r", "rx", "ry",
  "width", "x", "x1", "x2", "y", "y1", "y2",
]);

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/**
 * Inner markup only — no `<svg>` wrapper, and no stroke or size attributes, so
 * the wrapper's CSS is free to drive both.
 *
 * @param fillColor When set, node-level `fill="currentColor"` is substituted.
 *   Exactly 9 lucide icons carry it (palette, tag, tags, tag-plus, tag-x,
 *   images, key-round, chart-scatter, vault); they import with a broken fill
 *   otherwise. Leave undefined for previews, where CSS resolves it against the
 *   theme foreground.
 */
export function nodesToInnerMarkup(nodes: IconNode[], fillColor?: string): string {
  let out = "";
  for (const [tag, attrs] of nodes) {
    if (!ALLOWED_TAGS.has(tag)) continue;
    out += "<" + tag;
    for (const key in attrs) {
      if (!ALLOWED_ATTRS.has(key)) continue;
      let value = String(attrs[key]);
      if (key === "fill" && value === "currentColor" && fillColor) value = fillColor;
      out += ` ${key}="${escapeAttr(value)}"`;
    }
    out += "/>";
  }
  return out;
}

/**
 * A self-contained SVG for `penpot.createShapeFromSvg`. Contains no
 * `currentColor` and no CSS dependency of any kind.
 */
export function buildExportSvg(nodes: IconNode[], params: IconParams): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${params.size}" height="${params.size}"` +
    ` viewBox="0 0 24 24" fill="none" stroke="${INSERT_COLOR}"` +
    ` stroke-width="${params.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    nodesToInnerMarkup(nodes, INSERT_COLOR) +
    `</svg>`
  );
}
