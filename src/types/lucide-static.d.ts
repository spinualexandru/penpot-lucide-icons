/**
 * Ambient types for the two lucide-static JSON payloads we import.
 *
 * These exist because `resolveJsonModule` is off (see tsconfig.json) — without
 * it, tsc would read the real 723 KB file and infer a 1756-property literal
 * type. Vite resolves and bundles the JSON normally at build time regardless.
 *
 * Shapes verified against lucide-static@1.28.0: 1756 icons / 7032 nodes, every
 * node exactly a `[tag, attrs]` 2-tuple (never nested), and every icon has tags.
 */

declare module "lucide-static/icon-nodes.json" {
  const iconNodes: Record<string, [string, Record<string, string | number>][]>;
  export default iconNodes;
}

declare module "lucide-static/tags.json" {
  const tags: Record<string, string[]>;
  export default tags;
}
