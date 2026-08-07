/**
 * A windowed grid for large, uniform item lists.
 *
 * Only the visible rows (plus a little overscan) exist in the DOM; a spacer
 * element carries the full scroll height. Tiles are absolutely positioned and
 * moved with `transform`, which avoids layout on scroll.
 */

export interface GridOptions {
  /** Minimum tile width in px; column count is derived from it. */
  minTileWidth: number;
  /** Fixed row height in px. Must match the .vg-tile height in style.css. */
  tileHeight: number;
  /** Extra rows rendered above and below the viewport. */
  overscanRows: number;
  createTile: () => HTMLElement;
  renderTile: (tile: HTMLElement, name: string) => void;
  onPick: (name: string) => void;
}

export class VirtualGrid {
  private items: string[] = [];
  private pool: HTMLElement[] = [];
  private sizer = document.createElement("div");

  private cols = 1;
  private tileWidth = 0;
  private poolSize = 0;

  private lastStart = -1;
  private lastEnd = -1;
  /** Forces a full repaint: geometry changed, or the item list was replaced. */
  private dirty = true;
  private frame = 0;

  constructor(
    private scroller: HTMLElement,
    private opts: GridOptions,
  ) {
    this.sizer.className = "vg-sizer";
    scroller.appendChild(this.sizer);

    scroller.addEventListener("scroll", this.onScroll, { passive: true });
    new ResizeObserver(() => this.measure()).observe(scroller);

    // One delegated listener for all 1756 icons. Tiles are real <button>s, so
    // this also covers Enter/Space activation for keyboard users.
    this.sizer.addEventListener("click", (event) => {
      const tile = (event.target as Element | null)?.closest<HTMLElement>(".vg-tile");
      const name = tile?.dataset.icon;
      if (name) this.opts.onPick(name);
    });
  }

  setItems(items: string[]): void {
    this.items = items;
    this.scroller.scrollTop = 0;
    this.dirty = true;
    this.measure();
  }

  private onScroll = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  };

  private measure(): void {
    const width = this.scroller.clientWidth;
    const height = this.scroller.clientHeight;
    // Not laid out yet (or hidden). The ResizeObserver will call us again.
    if (width === 0 || height === 0) return;

    const cols = Math.max(1, Math.floor(width / this.opts.minTileWidth));
    const visibleRows = Math.ceil(height / this.opts.tileHeight) + 1;
    const poolSize = cols * (visibleRows + this.opts.overscanRows * 2);

    if (cols !== this.cols || poolSize !== this.poolSize) this.dirty = true;
    this.cols = cols;
    this.tileWidth = width / cols;
    this.poolSize = poolSize;

    this.sizer.style.height =
      Math.ceil(this.items.length / cols) * this.opts.tileHeight + "px";

    this.render();
  }

  private render(): void {
    if (this.poolSize === 0) return;

    while (this.pool.length < this.poolSize) {
      const tile = this.opts.createTile();
      tile.style.display = "none";
      this.sizer.appendChild(tile);
      this.pool.push(tile);
    }

    const { tileHeight, overscanRows } = this.opts;
    const firstRow = Math.max(
      0,
      Math.floor(this.scroller.scrollTop / tileHeight) - overscanRows,
    );
    const start = firstRow * this.cols;
    const end = Math.min(this.items.length, start + this.poolSize);
    if (!this.dirty && start === this.lastStart && end === this.lastEnd) return;

    // Index -> slot by modulo. Because poolSize is a whole number of rows,
    // scrolling one row reassigns exactly `cols` slots rather than churning the
    // entire pool, which is what keeps scrolling cheap.
    const live = new Set<number>();
    for (let i = start; i < end; i++) {
      const slot = i % this.poolSize;
      live.add(slot);

      const tile = this.pool[slot];
      const name = this.items[i];

      // Skips the innerHTML write when this slot already holds the right icon.
      if (tile.dataset.icon !== name) {
        tile.dataset.icon = name;
        this.opts.renderTile(tile, name);
      }
      if (this.dirty) tile.style.width = this.tileWidth + "px";

      const x = (i % this.cols) * this.tileWidth;
      const y = ((i / this.cols) | 0) * tileHeight;
      tile.style.transform = `translate(${x}px, ${y}px)`;
      tile.style.display = "";
    }

    for (let slot = 0; slot < this.pool.length; slot++) {
      if (!live.has(slot)) this.pool[slot].style.display = "none";
    }

    this.lastStart = start;
    this.lastEnd = end;
    this.dirty = false;
  }
}
