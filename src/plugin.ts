/**
 * Penpot sandbox entry.
 *
 * ⚠ This file is evaluated directly by Penpot's sandbox, NOT loaded as an ES
 * module with a resolver behind it. It MUST have zero runtime imports.
 *
 * That means: never import from src/ui/*, src/lib/ui.ts, or src/style.css here.
 * Only `import type` is allowed (it is erased before Rollup builds a module
 * graph, so no shared chunk can be emitted). All SVG markup is built in the UI
 * and arrives as a finished string, which is what keeps this file dependency-free.
 *
 * `npm run build` runs scripts/verify-plugin-bundle.mjs to enforce this.
 */
import type { UiToPlugin, PluginToUi } from "./lib/messages";

penpot.ui.open("Lucide Icons", `?theme=${penpot.theme}`, { width: 340, height: 640 });

const post = (message: PluginToUi) => penpot.ui.sendMessage(message);

penpot.ui.onMessage<UiToPlugin>((message) => {
  // onMessage<T> is an unchecked cast and any frame can post in here, so the
  // shape check is real validation rather than a type-system formality.
  if (typeof message !== "object" || message === null) return;
  if (message.type !== "insert-icon" || typeof message.svg !== "string") return;

  const { name, svg, params } = message;

  try {
    const group = penpot.createShapeFromSvg(svg);
    if (!group) throw new Error("Penpot could not parse the SVG");

    group.name = name;

    // Penpot may size the group from the 24x24 viewBox rather than the width/
    // height attributes. width/height are readonly on ShapeBase, so resize() is
    // the only way to correct it.
    if (
      Math.abs(group.width - params.size) > 0.5 ||
      Math.abs(group.height - params.size) > 0.5
    ) {
      group.resize(params.size, params.size);
    }

    group.x = penpot.viewport.center.x - group.width / 2;
    group.y = penpot.viewport.center.y - group.height / 2;
    penpot.selection = [group];

    post({ source: "penpot", type: "insert-result", ok: true, name });
  } catch (error) {
    // The UI runs in a different context, so without this ack a failed
    // insertion would be completely invisible to the user.
    post({
      source: "penpot",
      type: "insert-result",
      ok: false,
      name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

penpot.on("themechange", (theme) => {
  post({ source: "penpot", type: "themechange", theme });
});
