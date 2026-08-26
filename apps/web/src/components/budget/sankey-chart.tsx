import { CATEGORY_COLORS } from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { useEffect, useMemo, useRef, useState } from "react";

import { BAYER, OFF_TIER } from "@/components/dither-kit/dither-paint";
import { rgb, seedOfColor } from "@/components/dither-kit/palette";
import type { DitherColor, Seed } from "@/components/dither-kit/palette";

import { formatCurrency } from "./format-currency";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IncomeNode {
  name: string;
  value: number;
}

interface ExpenseNode {
  category: SpendingCategory;
  label: string;
  value: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface SankeyChartProps {
  incomeNodes: IncomeNode[];
  expenseNodes: ExpenseNode[];
  incomeLinks: Link[];
  expenseLinks: Link[];
  totalIncome: number;
  totalExpenses: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Layout types
// ---------------------------------------------------------------------------

interface NodeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  color: DitherColor;
  label: string;
  column: 0 | 1 | 2;
}

interface LinkBand {
  id: string;
  sx: number;
  sy0: number;
  sy1: number;
  tx: number;
  ty0: number;
  ty1: number;
  color: DitherColor;
  sourceId: string;
  targetId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const W = 700;
const CELL = 3;
const PAD = { bottom: 16, left: 12, right: 12, top: 20 };
const COL_FRAC = 0.22;
const NODE_GAP = 6;
const MIN_NODE_H = 16;
const MAX_COL_H = 260;
const ACCENT_W = 3;
const LABEL_MIN_H = 28;

// Dither fill intensities
const NODE_ALPHA = 0.5;
const LINK_ALPHA = 0.28;
const ACCENT_ALPHA = 0.85;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const incomeColor = (name: string): DitherColor => {
  const lower = name.toLowerCase();
  if (/salary|lön|wage|payroll/u.test(lower)) {
    return "green";
  }
  if (/dividend|divi/u.test(lower)) {
    return "purple";
  }
  if (/interest|ränta/u.test(lower)) {
    return "blue";
  }
  if (/refund|return/u.test(lower)) {
    return "orange";
  }
  return "green";
};

const svgLinkPath = (l: LinkBand): string => {
  const mx = (l.sx + l.tx) / 2;
  return [
    `M${l.sx},${l.sy0}`,
    `C${mx},${l.sy0} ${mx},${l.ty0} ${l.tx},${l.ty0}`,
    `L${l.tx},${l.ty1}`,
    `C${mx},${l.ty1} ${mx},${l.sy1} ${l.sx},${l.sy1}`,
    "Z",
  ].join(" ");
};

// ---------------------------------------------------------------------------
// Canvas paint helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SankeyChart = ({
  incomeNodes,
  expenseNodes,
  incomeLinks,
  expenseLinks,
  totalIncome,
  totalExpenses,
  className,
}: SankeyChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // ---- layout ----

  const layout = useMemo(() => {
    const usable = W - PAD.left - PAD.right;
    const colW = usable * COL_FRAC;
    const gapW = (usable - 3 * colW) / 2;

    const col0x = PAD.left;
    const col1x = col0x + colW + gapW;
    const col2x = col1x + colW + gapW;

    const maxVal = Math.max(totalIncome, totalExpenses, 1);

    // Left column — income sources
    const leftNodes: NodeRect[] = [];
    let ly = PAD.top;
    for (const n of incomeNodes) {
      const h = Math.max(MIN_NODE_H, (n.value / maxVal) * MAX_COL_H);
      leftNodes.push({
        color: incomeColor(n.name),
        column: 0,
        h,
        id: `L:${n.name}`,
        label: n.name,
        value: n.value,
        w: colW,
        x: col0x,
        y: ly,
      });
      ly += h + NODE_GAP;
    }

    // Center node — Budget hub
    const centerH = Math.max(MIN_NODE_H, (totalIncome / maxVal) * MAX_COL_H);
    const centerNode: NodeRect = {
      color: "blue",
      column: 1,
      h: centerH,
      id: "C:Budget",
      label: "Budget",
      value: totalIncome,
      w: colW,
      x: col1x,
      y: PAD.top,
    };

    // Right column — expense categories
    const rightNodes: NodeRect[] = [];
    let ry = PAD.top;
    for (const n of expenseNodes) {
      const h = Math.max(MIN_NODE_H, (n.value / maxVal) * MAX_COL_H);
      rightNodes.push({
        color: CATEGORY_COLORS[n.category],
        column: 2,
        h,
        id: `R:${n.label}`,
        label: n.label,
        value: n.value,
        w: colW,
        x: col2x,
        y: ry,
      });
      ry += h + NODE_GAP;
    }

    const height = Math.max(ly, ry, centerNode.y + centerNode.h) + PAD.bottom;

    // Income links (left → center)
    const links: LinkBand[] = [];
    const srcPorts = new Map<string, number>();
    let centerLeftPort = 0;
    for (const l of incomeLinks) {
      const src = leftNodes.find((n) => n.label === l.source);
      if (!src) {
        continue;
      }
      const off = srcPorts.get(src.id) ?? 0;
      const slice = Math.max(2, (l.value / src.value) * src.h);
      const sy0 = src.y + off;
      const sy1 = sy0 + slice;
      srcPorts.set(src.id, off + slice);

      const cSlice = Math.max(2, (l.value / maxVal) * MAX_COL_H);
      const ty0 = centerNode.y + centerLeftPort;
      const ty1 = ty0 + cSlice;
      centerLeftPort += cSlice;

      links.push({
        color: src.color,
        id: `IL:${l.source}→${l.target}`,
        sourceId: src.id,
        sx: src.x + src.w,
        sy0,
        sy1,
        targetId: centerNode.id,
        tx: centerNode.x,
        ty0,
        ty1,
      });
    }

    // Expense links (center → right)
    let centerRightPort = 0;
    for (const l of expenseLinks) {
      const tgt = rightNodes.find((n) => n.label === l.target);
      if (!tgt) {
        continue;
      }
      const cSlice = Math.max(2, (l.value / maxVal) * MAX_COL_H);
      const sy0 = centerNode.y + centerRightPort;
      const sy1 = sy0 + cSlice;
      centerRightPort += cSlice;

      links.push({
        color: tgt.color,
        id: `EL:${l.source}→${l.target}`,
        sourceId: centerNode.id,
        sx: centerNode.x + centerNode.w,
        sy0,
        sy1,
        targetId: tgt.id,
        tx: tgt.x,
        ty0: tgt.y,
        ty1: tgt.y + tgt.h,
      });
    }

    const allNodes: NodeRect[] = [...leftNodes, centerNode, ...rightNodes];

    return { allNodes, height, links };
  }, [
    incomeNodes,
    expenseNodes,
    incomeLinks,
    expenseLinks,
    totalIncome,
    totalExpenses,
  ]);

  // ---- backing canvas dimensions ----

  const cols = Math.max(8, Math.round(W / CELL));
  const rows = Math.max(8, Math.round(layout.height / CELL));
  const fx = cols / W;
  const fy = rows / layout.height;

  // ---- canvas paint ----

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    canvas.width = cols;
    canvas.height = rows;
    ctx.clearRect(0, 0, cols, rows);

    // Active set for hover highlighting
    const active = new Set<string>();
    if (hovered) {
      active.add(hovered);
      for (const l of layout.links) {
        if (l.sourceId === hovered || l.targetId === hovered) {
          active.add(l.sourceId);
          active.add(l.targetId);
          active.add(l.id);
        }
      }
    }

    const dimOf = (id: string) => (!hovered || active.has(id) ? 1 : 0.25);

    // 1. Links (behind nodes)
    for (const l of layout.links) {
      paintDitherLink(ctx, l, fx, fy, dimOf(l.id));
    }

    // 2. Nodes (on top)
    for (const n of layout.allNodes) {
      const seed = seedOfColor(n.color);
      const dim = dimOf(n.id);

      const bx0 = Math.round(n.x * fx);
      const by0 = Math.round(n.y * fy);
      const bx1 = Math.round((n.x + n.w) * fx);
      const by1 = Math.round((n.y + n.h) * fy);

      // Dithered body
      paintDitherRect(ctx, bx0, by0, bx1, by1, seed, NODE_ALPHA, dim);

      // Accent bar
      const aw = Math.max(1, Math.round(ACCENT_W * fx));
      if (n.column === 0) {
        paintAccent(ctx, bx0, by0, bx0 + aw, by1, seed, dim);
      } else if (n.column === 2) {
        paintAccent(ctx, bx1 - aw, by0, bx1, by1, seed, dim);
      } else {
        paintAccent(ctx, bx0, by0, bx0 + aw, by1, seed, dim);
        paintAccent(ctx, bx1 - aw, by0, bx1, by1, seed, dim);
      }
    }
  }, [layout, hovered, cols, rows, fx, fy]);

  if (incomeNodes.length === 0 && expenseNodes.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xs font-medium">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="relative"
          style={{ aspectRatio: `${W} / ${layout.height}` }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block h-full w-full"
            style={{ imageRendering: "pixelated" }}
          />

          {/* SVG overlay — crisp text + pointer hit areas */}
          <svg
            className="absolute inset-0 h-full w-full select-none"
            viewBox={`0 0 ${W} ${layout.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Link hit areas */}
            {layout.links.map((l) => (
              <path
                key={`h-${l.id}`}
                d={svgLinkPath(l)}
                fill="transparent"
                onPointerEnter={() =>
                  setHovered(
                    l.sourceId === "C:Budget" ? l.targetId : l.sourceId
                  )
                }
                onPointerLeave={() => setHovered(null)}
              />
            ))}

            {/* Node hit areas */}
            {layout.allNodes.map((n) => (
              <rect
                key={`h-${n.id}`}
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                fill="transparent"
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
              />
            ))}

            {/* Node labels */}
            {layout.allNodes.map((n) => {
              const inside = n.h >= LABEL_MIN_H;
              const cx = n.x + n.w / 2;
              const cy = n.y + n.h / 2;
              const labelText =
                n.label.length > 22 ? `${n.label.slice(0, 20)}…` : n.label;

              if (n.column === 1) {
                // Center node — label above
                return (
                  <text
                    key={`t-${n.id}`}
                    x={cx}
                    y={n.y - 6}
                    textAnchor="middle"
                    className="fill-foreground pointer-events-none text-[10px] font-medium"
                  >
                    {n.label}: {formatCurrency(n.value)}
                  </text>
                );
              }

              if (inside) {
                // Large node — label centered inside
                return (
                  <g key={`t-${n.id}`} className="pointer-events-none">
                    <text
                      x={cx}
                      y={cy - 5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-foreground text-[9px] font-medium"
                    >
                      {labelText}
                    </text>
                    <text
                      x={cx}
                      y={cy + 7}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-foreground/70 text-[8px]"
                    >
                      {formatCurrency(n.value)}
                    </text>
                  </g>
                );
              }

              // Small node — label outside
              const isLeft = n.column === 0;
              return (
                <text
                  key={`t-${n.id}`}
                  x={isLeft ? n.x + n.w + 6 : n.x - 6}
                  y={cy}
                  textAnchor={isLeft ? "start" : "end"}
                  dominantBaseline="central"
                  className="fill-muted-foreground pointer-events-none text-[9px]"
                >
                  {labelText}: {formatCurrency(n.value)}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Summary */}
        <div className="mt-2 flex justify-between font-mono text-[11px]">
          <span className="text-muted-foreground">
            Income:{" "}
            <span className="text-foreground">
              {formatCurrency(totalIncome)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Expenses:{" "}
            <span className="text-foreground">
              {formatCurrency(totalExpenses)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Net:{" "}
            <span
              className={
                totalIncome - totalExpenses >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {formatCurrency(totalIncome - totalExpenses)}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
