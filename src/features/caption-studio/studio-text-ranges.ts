export type StudioTextRange = { left: number; right: number };
export type StudioRangeMeasurer = (ctx: CanvasRenderingContext2D, line: string, from: number, to: number) => StudioTextRange[];
const cache = new Map<string, StudioTextRange[]>();

// Ask the browser's shaping/bidi engine for physical glyph ranges. Measuring
// isolated word widths would misplace mixed RTL/LTR and joined-script words.
// Render the full shaped line through these clips, never redraw isolated words.
export const measureStudioTextRange: StudioRangeMeasurer = (ctx, line, from, to) => {
  if (typeof document === "undefined" || !document.body) return [];
  const key = JSON.stringify([ctx.font, ctx.direction, ctx.letterSpacing, ctx.wordSpacing, line, from, to]);
  const hit = cache.get(key); if (hit) return hit;
  const span = document.createElement("span");
  Object.assign(span.style, { all: "initial", position: "fixed", top: "0", left: "-100000px", visibility: "hidden", pointerEvents: "none", display: "inline-block", whiteSpace: "pre", font: ctx.font, direction: ctx.direction === "rtl" ? "rtl" : "ltr", unicodeBidi: "normal", letterSpacing: ctx.letterSpacing || "0px", wordSpacing: ctx.wordSpacing || "0px", fontKerning: ctx.fontKerning || "auto" });
  span.textContent = line; span.setAttribute("aria-hidden", "true"); document.body.append(span);
  try {
    const range = document.createRange(), node = span.firstChild!;
    range.setStart(node, from); range.setEnd(node, to);
    const origin = span.getBoundingClientRect(), canvasWidth = ctx.measureText(line).width, scale = origin.width ? canvasWidth / origin.width : 1;
    const rectangles = Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => ({ left: (rect.left - origin.left) * scale, right: (rect.right - origin.left) * scale }));
    if (document.fonts?.status === "loaded") { if (cache.size >= 256) cache.delete(cache.keys().next().value!); cache.set(key, rectangles); }
    return rectangles;
  } finally { span.remove(); }
};

// Draw a separate background behind the *measured* active word. Coordinates
// are physical glyph spans from the browser's bidirectional text shaper, not
// guessed word widths. No background is drawn for absent timing spans.
export function drawStudioWordBackground(
  ctx: CanvasRenderingContext2D, left: number, y: number, size: number,
  lineHeight: number, color: string, ranges: readonly StudioTextRange[]
) {
  const pad = size * .1, height = Math.min(lineHeight * .92, size * 1.2);
  ctx.save();
  try {
    // Keep existing caption opacity but never duplicate the text shadow here.
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    for (const range of ranges) {
      if (!Number.isFinite(range.left) || !Number.isFinite(range.right) || range.right <= range.left) continue;
      ctx.beginPath();
      ctx.roundRect(left + range.left - pad, y - height / 2, range.right - range.left + pad * 2, height, size * .16);
      ctx.fill();
    }
  } finally { ctx.restore(); }
}

export function drawStudioHighlightedLine(ctx: CanvasRenderingContext2D, line: string, left: number, y: number, size: number, lineHeight: number, color: string, highlight: string, ranges: StudioTextRange[]) {
  const canvas = ctx.canvas.ownerDocument.createElement("canvas"), padding = size * 2;
  canvas.width = Math.ceil(ctx.measureText(line).width + padding * 2); canvas.height = Math.ceil(Math.max(size * 4, lineHeight * 2));
  try {
    const layer = canvas.getContext("2d"); if (!layer) throw new Error("Word highlighting needs a working video canvas.");
    layer.font = ctx.font; layer.direction = ctx.direction; layer.textAlign = "left"; layer.textBaseline = "middle";
    layer.letterSpacing = ctx.letterSpacing; layer.wordSpacing = ctx.wordSpacing; layer.fontKerning = ctx.fontKerning;
    layer.fillStyle = color; layer.fillText(line, padding, canvas.height / 2);
    // Recolor the already-shaped glyphs, retaining their exact alpha. Applying
    // the layer once also preserves the user's caption opacity and fade motion.
    layer.globalCompositeOperation = "source-atop"; layer.fillStyle = highlight;
    for (const range of ranges) layer.fillRect(padding + range.left, 0, range.right - range.left, canvas.height);
    ctx.drawImage(canvas, left - padding, y - canvas.height / 2);
  } finally { canvas.width = 0; canvas.height = 0; }
}
