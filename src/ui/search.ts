/**
 * Icon search over names and lucide's own keyword tags.
 *
 * 1756 icons times a handful of `includes` calls runs in well under a
 * millisecond, so there is no fuzzy-match library, trie or worker here — a
 * linear scan is genuinely the right tool. The caller still debounces input so
 * the grid re-renders once per typing pause rather than per keystroke.
 */
import type { IconDb } from "./icons";

export interface SearchIndex {
  names: string[];
  /** Lowercased "name words + tags" per icon, parallel to `names`. */
  haystacks: string[];
}

export function buildIndex(db: IconDb): SearchIndex {
  const haystacks = db.names.map((name) => {
    const tags = db.tags[name];
    // Hyphens become spaces so "arrow up" matches "arrow-up-right".
    const words = name.replace(/-/g, " ");
    return (tags ? `${words} ${tags.join(" ")}` : words).toLowerCase();
  });
  return { names: db.names, haystacks };
}

/**
 * Every whitespace-separated token must appear somewhere in the icon's name or
 * tags. Results are bucketed so the most literal matches surface first.
 */
export function search(index: SearchIndex, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return index.names;

  // Tokenize on hyphens as well as whitespace: the haystacks store name words
  // space-separated, so an exact hyphenated name like "chart-scatter" would
  // otherwise match nothing. `q` itself stays intact for the ranking below,
  // where it is compared against real (hyphenated) icon names.
  const tokens = q.split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return index.names;
  const exact: string[] = [];
  const prefix: string[] = [];
  const rest: string[] = [];

  for (let i = 0; i < index.names.length; i++) {
    const haystack = index.haystacks[i];
    let matches = true;
    for (const token of tokens) {
      if (!haystack.includes(token)) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;

    const name = index.names[i];
    if (name === q) exact.push(name);
    else if (name.startsWith(q)) prefix.push(name);
    else rest.push(name);
  }

  return exact.concat(prefix, rest);
}
