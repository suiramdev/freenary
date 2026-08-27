import { BAYER, OFF_TIER } from "@/components/dither-kit/dither-paint";
import { rgb, seedOfColor } from "@/components/dither-kit/palette";
import type { Seed } from "@/components/dither-kit/palette";
import { ACCENT_W } from "@/lib/sankey/layout";
import type { LinkBand, SankeyLayout } from "@/lib/sankey/layout";

// Dither fill intensities
const NODE_ALPHA = 0.5;
const LINK_ALPHA = 0.28;
const ACCENT_ALPHA = 0.85;
const DIMMED = 0.25;

/** Dithered rectangle — uniform Bayer scatter at a fixed alpha. */
const paintDitherRect = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  seed: Seed,
  alpha: number,
  dim: number
) => {
  const threshold = 0.55;
  for (let x = x0; x < x1; x += 1) {
    for (let y = y0; y < y1; y += 1) {
      const lit = BAYER[y % 4][x % 4] < threshold;
      const a = (lit ? alpha : alpha * OFF_TIER) * dim;
      ctx.fillStyle = rgb(seed.fill, 1, a);
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

/** Solid accent strip (no dithering). */
const paintAccent = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  seed: Seed,
  dim: number
) => {
  ctx.fillStyle = rgb(seed.fill, 1, ACCENT_ALPHA * dim);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
};

/** Dithered bezier link — clip to the ribbon path, then scatter-fill. */
const paintDitherLink = (
  ctx: CanvasRenderingContext2D,
  link: LinkBand,
  fx: number,
  fy: number,
  dim: number
) => {
  const bsx = Math.round(link.sx * fx);
  const bsy0 = Math.round(link.sy0 * fy);
  const bsy1 = Math.round(link.sy1 * fy);
  const btx = Math.round(link.tx * fx);
  const bty0 = Math.round(link.ty0 * fy);
  const bty1 = Math.round(link.ty1 * fy);
  const bmx = (bsx + btx) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bsx, bsy0);
  ctx.bezierCurveTo(bmx, bsy0, bmx, bty0, btx, bty0);
  ctx.lineTo(btx, bty1);
  ctx.bezierCurveTo(bmx, bty1, bmx, bsy1, bsx, bsy1);
  ctx.closePath();
  ctx.clip();

  const seed = seedOfColor(link.color);
  const minX = Math.min(bsx, btx);
  const maxX = Math.max(bsx, btx);
  const minY = Math.min(bsy0, bsy1, bty0, bty1);
  const maxY = Math.max(bsy0, bsy1, bty0, bty1);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const lit = BAYER[y % 4][x % 4] < 0.48;
      const a = (lit ? LINK_ALPHA : LINK_ALPHA * OFF_TIER) * dim;
      ctx.fillStyle = rgb(seed.fill, 1, a);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.restore();
};

export const paintSankey = (
  ctx: CanvasRenderingContext2D,
  {
    layout,
    hovered,
    cols,
    rows,
    fx,
    fy,
  }: {
    layout: SankeyLayout;
    hovered: string | null;
    cols: number;
    rows: number;
    fx: number;
    fy: number;
  }
) => {
  ctx.clearRect(0, 0, cols, rows);

  // Hovering a node keeps that node, its ribbons, and their far ends lit.
  const active = new Set<string>();
  if (hovered) {
    active.add(hovered);
    for (const link of layout.links) {
      if (link.sourceId === hovered || link.targetId === hovered) {
        active.add(link.sourceId);
        active.add(link.targetId);
        active.add(link.id);
      }
    }
  }

  const dimOf = (id: string) => (!hovered || active.has(id) ? 1 : DIMMED);

  for (const link of layout.links) {
    paintDitherLink(ctx, link, fx, fy, dimOf(link.id));
  }

  for (const node of layout.nodes) {
    const seed = seedOfColor(node.color);
    const dim = dimOf(node.id);

    const bx0 = Math.round(node.x * fx);
    const by0 = Math.round(node.y * fy);
    const bx1 = Math.round((node.x + node.w) * fx);
    const by1 = Math.round((node.y + node.h) * fy);

    paintDitherRect(ctx, bx0, by0, bx1, by1, seed, NODE_ALPHA, dim);

    // Accent bars mark where flow enters and leaves the node.
    const aw = Math.max(1, Math.round(ACCENT_W * fx));
    if (node.column !== 2) {
      paintAccent(ctx, bx0, by0, bx0 + aw, by1, seed, dim);
    }
    if (node.column !== 0) {
      paintAccent(ctx, bx1 - aw, by0, bx1, by1, seed, dim);
    }
  }
};
