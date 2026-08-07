/**
 * Lazy loader for the lucide icon dataset.
 *
 * The two JSON payloads are ~960 KB combined. They are pulled in with a dynamic
 * import so Vite emits them as a separate chunk and the UI shell (search bar and
 * controls) paints before they arrive.
 */
import { nodesToInnerMarkup, type IconNode } from "./svg";

export interface IconDb {
  /** All icon names, sorted. 1756 of them in lucide-static@1.28.0. */
  names: string[];
  nodes: Record<string, IconNode[]>;
  /** Search keywords per icon. Every icon has an entry. */
  tags: Record<string, string[]>;
}

let dbPromise: Promise<IconDb> | null = null;

export function loadIconData(): Promise<IconDb> {
  dbPromise ??= (async () => {
    const [nodesModule, tagsModule] = await Promise.all([
      import("lucide-static/icon-nodes.json"),
      import("lucide-static/tags.json"),
    ]);
    const nodes = nodesModule.default as Record<string, IconNode[]>;
    return { names: Object.keys(nodes).sort(), nodes, tags: tagsModule.default };
  })();
  return dbPromise;
}

// Preview markup carries no size, stroke or color — those are CSS — so it can
// never be invalidated by a control change. Each icon is built at most once for
// the lifetime of the plugin, however many times it scrolls in and out of view.
const previewCache = new Map<string, string>();

export function getPreviewMarkup(db: IconDb, name: string): string {
  let markup = previewCache.get(name);
  if (markup === undefined) {
    markup = nodesToInnerMarkup(db.nodes[name]);
    previewCache.set(name, markup);
  }
  return markup;
}
