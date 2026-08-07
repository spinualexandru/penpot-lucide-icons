/**
 * Plugin UI entry (runs in the iframe).
 *
 * Owns the control state, boots the virtualized grid, and hands finished SVG
 * markup to the sandbox. Note that the SVG is built here rather than in
 * plugin.ts on purpose — see the banner in src/plugin.ts.
 */
import { onInit, select } from "./lib/ui";
import type { IconParams, PluginToUi, UiToPlugin } from "./lib/messages";
import { getPreviewMarkup, loadIconData, type IconDb } from "./ui/icons";
import { buildIndex, search, type SearchIndex } from "./ui/search";
import { buildExportSvg } from "./ui/svg";
import { VirtualGrid } from "./ui/virtual-grid";
import "./style.css";

/** Drives --vg-tile-height, so the grid maths and the CSS cannot drift apart. */
const TILE_HEIGHT = 72;
const MIN_TILE_WIDTH = 72;
const SEARCH_DEBOUNCE_MS = 120;

const params: IconParams = { size: 24, strokeWidth: 2 };

const send = (message: UiToPlugin) => parent.postMessage(message, "*");

const root = document.documentElement.style;

/**
 * Reads a number input, ignoring intermediate junk (empty, "-", "1e") so that
 * typing never snaps the value out from under the user. Out-of-range values are
 * clamped rather than rejected.
 */
function readNumber(input: HTMLInputElement, min: number, max: number): number | null {
  const value = Number(input.value);
  if (input.value.trim() === "" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

onInit(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const theme = searchParams.get("theme") ?? "light";
  document.body.dataset.theme = theme;

  const searchInput = select("search") as HTMLInputElement | null;
  const sizeInput = select("size") as HTMLInputElement | null;
  const strokeInput = select("stroke") as HTMLInputElement | null;
  const gridEl = select("grid");
  const countEl = select("count");
  const emptyEl = select("empty");
  const statusEl = select("status");

  if (
    !searchInput || !sizeInput || !strokeInput ||
    !gridEl || !countEl || !emptyEl || !statusEl
  ) {
    throw new Error("Plugin UI markup is missing a required element");
  }

  root.setProperty("--vg-tile-height", `${TILE_HEIGHT}px`);
  root.setProperty("--icon-stroke", String(params.strokeWidth));

  let statusTimer = 0;
  function setStatus(text: string, isError = false): void {
    statusEl!.textContent = text;
    statusEl!.dataset.error = String(isError);
    clearTimeout(statusTimer);
    if (text && !isError) {
      statusTimer = window.setTimeout(() => {
        statusEl!.textContent = "";
      }, 2500);
    }
  }

  let db: IconDb | null = null;
  let index: SearchIndex | null = null;

  const grid = new VirtualGrid(gridEl, {
    minTileWidth: MIN_TILE_WIDTH,
    tileHeight: TILE_HEIGHT,
    overscanRows: 2,
    createTile: () => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "vg-tile";
      // The wrapper is built once per pool slot and never rebuilt; recycling
      // only swaps the geometry children. Size, stroke and colour are CSS.
      tile.innerHTML =
        `<svg class="lucide-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>` +
        `<span class="vg-label body-xs"></span>`;
      return tile;
    },
    renderTile: (tile, name) => {
      (tile.firstElementChild as SVGElement).innerHTML = getPreviewMarkup(db!, name);
      (tile.lastElementChild as HTMLElement).textContent = name;
      tile.title = name;
      tile.setAttribute("aria-label", name);
    },
    onPick: (name) => {
      if (!db) return;
      send({
        type: "insert-icon",
        name,
        svg: buildExportSvg(db.nodes[name], params),
        params: { ...params },
      });
    },
  });

  function applyFilter(): void {
    if (!db || !index) return;
    const results = search(index, searchInput!.value);
    grid.setItems(results);

    const total = db.names.length;
    countEl!.textContent =
      results.length === total
        ? `${total.toLocaleString()} icons`
        : `${results.length.toLocaleString()} of ${total.toLocaleString()} icons`;

    const isEmpty = results.length === 0;
    emptyEl!.hidden = !isEmpty;
    if (isEmpty) emptyEl!.textContent = `No icons match “${searchInput!.value.trim()}”`;
  }

  let searchTimer = 0;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(applyFilter, SEARCH_DEBOUNCE_MS);
  });

  sizeInput.addEventListener("input", () => {
    const value = readNumber(sizeInput, 8, 512);
    if (value !== null) params.size = value;
    // Deliberately no re-render: size affects only what gets inserted.
  });

  strokeInput.addEventListener("input", () => {
    const value = readNumber(strokeInput, 0.5, 4);
    if (value === null) return;
    params.strokeWidth = value;
    // The entire update path: one custom property, no DOM work.
    root.setProperty("--icon-stroke", String(value));
  });

  // Snap the visible value back to the clamped one once editing settles.
  sizeInput.addEventListener("change", () => {
    sizeInput.value = String(params.size);
  });
  strokeInput.addEventListener("change", () => {
    strokeInput.value = String(params.strokeWidth);
  });

  window.addEventListener("message", (event: MessageEvent<PluginToUi>) => {
    const data = event.data;
    if (data?.source !== "penpot") return;

    if (data.type === "themechange") {
      document.body.dataset.theme = data.theme;
    } else if (data.type === "insert-result") {
      setStatus(
        data.ok ? `Inserted ${data.name}` : `Could not insert ${data.name}: ${data.error}`,
        !data.ok,
      );
    }
  });

  loadIconData().then(
    (loaded) => {
      db = loaded;
      index = buildIndex(loaded);
      applyFilter();
    },
    (error: unknown) => {
      countEl.textContent = "";
      setStatus(
        `Could not load icons: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    },
  );
});
