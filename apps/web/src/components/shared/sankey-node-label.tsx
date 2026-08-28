import { LABEL_MIN_H } from "@/lib/sankey/layout";
import type { NodeRect } from "@/lib/sankey/layout";

const MAX_LABEL_CHARS = 22;
const TRUNCATED_CHARS = 20;

interface SankeyNodeLabelProps {
  formatValue: (value: number) => string;
  /** Draws the label above the node instead of inside it. */
  isEmphasized: boolean;
  isFirstColumn: boolean;
  node: NodeRect;
}

export const SankeyNodeLabel = ({
  formatValue,
  isEmphasized,
  isFirstColumn,
  node,
}: SankeyNodeLabelProps) => {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const labelText =
    node.label.length > MAX_LABEL_CHARS
      ? `${node.label.slice(0, TRUNCATED_CHARS)}…`
      : node.label;

  if (isEmphasized) {
    return (
      <text
        x={cx}
        y={node.y - 6}
        textAnchor="middle"
        className="fill-foreground pointer-events-none text-[10px] font-medium"
      >
        {node.label}: {formatValue(node.value)}
      </text>
    );
  }

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

  // Too short for an inside label — set it beside the node instead.
  return (
    <text
      x={isFirstColumn ? node.x + node.w + 6 : node.x - 6}
      y={cy}
      textAnchor={isFirstColumn ? "start" : "end"}
      dominantBaseline="central"
      className="fill-muted-foreground pointer-events-none text-[9px]"
    >
      {labelText}: {formatValue(node.value)}
    </text>
  );
};
