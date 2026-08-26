import { CATEGORY_COLORS } from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { useMemo, useState } from "react";

import { rgb, seedOfColor } from "@/components/dither-kit/palette";
import type { DitherColor } from "@/components/dither-kit/palette";

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
// Layout constants
// ---------------------------------------------------------------------------

const PADDING = { bottom: 12, left: 12, right: 12, top: 12 };
const NODE_WIDTH = 14;
const NODE_GAP = 6;
// Fraction of usable width between columns
const COL_GAP = 0.32;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const linkPath = (
  sx: number,
  sy0: number,
  sy1: number,
  tx: number,
  ty0: number,
  ty1: number
): string => {
  const mx = (sx + tx) / 2;
  return [
    `M${sx},${sy0}`,
    `C${mx},${sy0} ${mx},${ty0} ${tx},${ty0}`,
    `L${tx},${ty1}`,
    `C${mx},${ty1} ${mx},${sy1} ${sx},${sy1}`,
    "Z",
  ].join(" ");
};

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
  const [hovered, setHovered] = useState<string | null>(null);

  const layout = useMemo(() => {
    const WIDTH = 600;
    const usable = WIDTH - PADDING.left - PADDING.right;
    const colWidth = (usable - 2 * COL_GAP * usable) / 3;

    // Column x positions
    const col0x = PADDING.left;
    const col1x = PADDING.left + colWidth + COL_GAP * usable;
    const col2x = WIDTH - PADDING.right - colWidth;

    // Compute heights per column from the max total
    const maxValue = Math.max(totalIncome, totalExpenses, 1);
    const maxColHeight = 280;

    // Layout left column (income sources)
    const leftNodes: {
      name: string;
      x: number;
      y: number;
      w: number;
      h: number;
      value: number;
      color: DitherColor;
    }[] = [];
    let ly = PADDING.top;
    for (const n of incomeNodes) {
      const h = Math.max(4, (n.value / maxValue) * maxColHeight);
      leftNodes.push({
        color: incomeColor(n.name),
        h,
        name: n.name,
        value: n.value,
        w: NODE_WIDTH,
        x: col0x,
        y: ly,
      });
      ly += h + NODE_GAP;
    }

    // Layout center node (Budget hub)
    const centerH = (totalIncome / maxValue) * maxColHeight;
    const centerNode = {
      // SAFETY: literal "blue" is a valid DitherColor; assertion narrows the string
      color: "blue" as DitherColor,
      h: Math.max(4, centerH),
      name: "Budget",
      value: totalIncome,
      w: NODE_WIDTH,
      x: col1x + colWidth / 2 - NODE_WIDTH / 2,
      y: PADDING.top,
    };

    // Layout right column (expense categories)
    const rightNodes: {
      name: string;
      category: SpendingCategory;
      x: number;
      y: number;
      w: number;
      h: number;
      value: number;
      color: DitherColor;
    }[] = [];
    let ry = PADDING.top;
    for (const n of expenseNodes) {
      const h = Math.max(4, (n.value / maxValue) * maxColHeight);
      rightNodes.push({
        category: n.category,
        color: CATEGORY_COLORS[n.category],
        h,
        name: n.label,
        value: n.value,
        w: NODE_WIDTH,
        x: col2x + colWidth - NODE_WIDTH,
        y: ry,
      });
      ry += h + NODE_GAP;
    }

    // Compute total height
    const totalHeight =
      Math.max(ly, ry, centerNode.y + centerNode.h + PADDING.bottom) +
      PADDING.bottom;

    // Build income links (left → center)
    const iLinks: {
      color: DitherColor;
      d: string;
      key: string;
      source: string;
      value: number;
    }[] = [];
    const leftState = { center: 0, left: 0 };
    for (const l of incomeLinks) {
      const src = leftNodes.find((n) => n.name === l.source);
      if (!src) {
        continue;
      }
      const thickness = (l.value / maxValue) * maxColHeight;
      const sy0 = src.y + leftState.left;
      const sy1 = sy0 + Math.max(2, (l.value / src.value) * src.h);
      leftState.left += sy1 - sy0;
      const ty0 = centerNode.y + leftState.center;
      const ty1 = ty0 + Math.max(2, thickness);
      leftState.center += ty1 - ty0;
      iLinks.push({
        color: src.color,
        d: linkPath(src.x + src.w, sy0, sy1, centerNode.x, ty0, ty1),
        key: `${l.source}→${l.target}`,
        source: l.source,
        value: l.value,
      });
    }

    // Build expense links (center → right)
    const eLinks: {
      color: DitherColor;
      d: string;
      key: string;
      target: string;
      value: number;
    }[] = [];
    let rightOffset = 0;
    for (const l of expenseLinks) {
      const tgt = rightNodes.find((n) => n.name === l.target);
      if (!tgt) {
        continue;
      }
      const thickness = (l.value / maxValue) * maxColHeight;
      const sy0 = centerNode.y + rightOffset;
      const sy1 = sy0 + Math.max(2, thickness);
      rightOffset += sy1 - sy0;
      eLinks.push({
        color: tgt.color,
        d: linkPath(
          centerNode.x + centerNode.w,
          sy0,
          sy1,
          tgt.x,
          tgt.y,
          tgt.y + tgt.h
        ),
        key: `${l.source}→${l.target}`,
        target: l.target,
        value: l.value,
      });
    }

    return {
      centerNode,
      expenseLinks: eLinks,
      height: totalHeight,
      incomeLinks: iLinks,
      leftNodes,
      rightNodes,
      width: WIDTH,
    };
  }, [
    incomeNodes,
    expenseNodes,
    incomeLinks,
    expenseLinks,
    totalIncome,
    totalExpenses,
  ]);

  if (incomeNodes.length === 0 && expenseNodes.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xs font-medium">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="w-full"
          style={{ maxHeight: 400 }}
        >
          {/* Income links */}
          {layout.incomeLinks.map(
            (l) =>
              l && (
                <path
                  key={l.key}
                  d={l.d}
                  fill={rgb(
                    seedOfColor(l.color).fill,
                    1,
                    hovered && hovered !== l.source ? 0.15 : 0.4
                  )}
                  stroke="none"
                  onPointerEnter={() => setHovered(l.source)}
                  onPointerLeave={() => setHovered(null)}
                />
              )
          )}

          {/* Expense links */}
          {layout.expenseLinks.map(
            (l) =>
              l && (
                <path
                  key={l.key}
                  d={l.d}
                  fill={rgb(
                    seedOfColor(l.color).fill,
                    1,
                    hovered && hovered !== l.target ? 0.15 : 0.4
                  )}
                  stroke="none"
                  onPointerEnter={() => setHovered(l.target)}
                  onPointerLeave={() => setHovered(null)}
                />
              )
          )}

          {/* Left nodes (income sources) */}
          {layout.leftNodes.map((n) => (
            <g key={`l-${n.name}`}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={2}
                fill={rgb(
                  seedOfColor(n.color).fill,
                  1,
                  hovered && hovered !== n.name ? 0.3 : 0.9
                )}
                onPointerEnter={() => setHovered(n.name)}
                onPointerLeave={() => setHovered(null)}
              />
              <text
                x={n.x + n.w + 4}
                y={n.y + n.h / 2}
                dominantBaseline="central"
                className="fill-muted-foreground text-[9px]"
              >
                {n.name.length > 18 ? `${n.name.slice(0, 16)}…` : n.name}
              </text>
            </g>
          ))}

          {/* Center node (Budget) */}
          <g>
            <rect
              x={layout.centerNode.x}
              y={layout.centerNode.y}
              width={layout.centerNode.w}
              height={layout.centerNode.h}
              rx={2}
              fill={rgb(seedOfColor("blue").fill, 1, 0.9)}
            />
            <text
              x={layout.centerNode.x + layout.centerNode.w / 2}
              y={layout.centerNode.y - 4}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-medium"
            >
              Budget
            </text>
          </g>

          {/* Right nodes (expense categories) */}
          {layout.rightNodes.map((n) => (
            <g key={`r-${n.name}`}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={2}
                fill={rgb(
                  seedOfColor(n.color).fill,
                  1,
                  hovered && hovered !== n.name ? 0.3 : 0.9
                )}
                onPointerEnter={() => setHovered(n.name)}
                onPointerLeave={() => setHovered(null)}
              />
              <text
                x={n.x - 4}
                y={n.y + n.h / 2}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-muted-foreground text-[9px]"
              >
                {n.name}
              </text>
            </g>
          ))}

          {/* Hover tooltip */}
          {hovered &&
            (() => {
              const node =
                layout.leftNodes.find((n) => n.name === hovered) ??
                layout.rightNodes.find((n) => n.name === hovered);
              if (!node) {
                return null;
              }
              const isLeft = layout.leftNodes.some((n) => n.name === hovered);
              const tx = isLeft ? node.x + node.w + 4 : node.x - 4;
              return (
                <text
                  x={tx}
                  y={node.y + node.h / 2 + 12}
                  textAnchor={isLeft ? "start" : "end"}
                  dominantBaseline="central"
                  className="fill-foreground text-[9px] font-medium"
                >
                  {formatCurrency(node.value)}
                </text>
              );
            })()}
        </svg>

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
