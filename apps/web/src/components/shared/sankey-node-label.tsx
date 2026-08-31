import { LABEL_INSET, LABEL_MIN_H } from "@/lib/sankey/layout";
import type { NodeRect } from "@/lib/sankey/layout";
import { fitSideLabel } from "@/lib/sankey/side-label";

const MAX_LABEL_CHARS = 22;
const TRUNCATED_CHARS = 20;
/** Rough width of one character at the 9px side-label size, in user units. */
const CHAR_W = 4.6;

interface SankeyNodeLabelProps {
  formatValue: (value: number) => string;
  isFirstColumn: boolean;
  node: NodeRect;
}

export const SankeyNodeLabel = ({
  formatValue,
  isFirstColumn,
  node,
}: SankeyNodeLabelProps) => {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const labelText =
    node.label.length > MAX_LABEL_CHARS
      ? `${node.label.slice(0, TRUNCATED_CHARS)}…`
      : node.label;

  if (node.h >= LABEL_MIN_H) {
    return (
      <g className="pointer-events-none">
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
          {formatValue(node.value)}
        </text>
      </g>
    );
  }

  // Too short for an inside label — set it beside the node instead. The layout
  // has already narrowed the budget where a neighbouring column aims a label at
  // the same gap and rows, so fitting to it cannot overlap.
  const fitted = fitSideLabel(
    node.label,
    formatValue(node.value),
    Math.floor(node.labelBudget / CHAR_W)
  );
  if (fitted === null) {
    return null;
  }

  return (
    <text
      x={isFirstColumn ? node.x + node.w + LABEL_INSET : node.x - LABEL_INSET}
      y={cy}
      textAnchor={isFirstColumn ? "start" : "end"}
      dominantBaseline="central"
      className="fill-muted-foreground pointer-events-none text-[9px]"
    >
      {fitted}
    </text>
  );
};
