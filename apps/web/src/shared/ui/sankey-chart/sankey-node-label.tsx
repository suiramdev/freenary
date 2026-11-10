import { useSankey } from "@freenary/ui/components/charts/sankey";
import type { SankeyContextValue } from "@freenary/ui/components/charts/sankey";

import { fitSideLabel } from "../../lib/sankey";
import { litNodeIndexes } from "./sankey-flow-data";
import type { FlowGraph } from "./sankey-flow-data";

type PlacedNode = SankeyContextValue["nodes"][number];

interface SankeyNodeLabelsProps {
  formatValue: (value: number) => string;
  graph: FlowGraph;
}

interface LabelPlacement {
  anchor: "end" | "start";
  maxChars: number;
  x: number;
}

const LABEL_INSET = 6;
const LABEL_CHAR_WIDTH = 5.6;
const TWO_LINE_MIN_H = 26;
const LINE_OFFSET = 6;
const EDGE_TOLERANCE = 1;
const DIMMED_OPACITY = 0.35;
const ELLIPSIS = "…";
const HALO_STYLE = { paintOrder: "stroke" } as const;

const charsIn = (width: number) =>
  Math.max(0, Math.floor((width - LABEL_INSET) / LABEL_CHAR_WIDTH));

const truncate = (text: string, maxChars: number) =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}${ELLIPSIS}`;

const nextColumnStart = (nodes: PlacedNode[], after: number) => {
  let nearest = Number.POSITIVE_INFINITY;

  for (const candidate of nodes) {
    const start = candidate.x0 ?? 0;

    if (start > after && start < nearest) {
      nearest = start;
    }
  }

  return nearest;
};

const placementOf = (
  node: PlacedNode,
  nodes: PlacedNode[],
  innerWidth: number,
  margin: { left: number; right: number }
): LabelPlacement => {
  const x0 = node.x0 ?? 0;
  const x1 = node.x1 ?? 0;

  if (x0 <= EDGE_TOLERANCE) {
    return {
      anchor: "end",
      maxChars: charsIn(margin.left),
      x: x0 - LABEL_INSET,
    };
  }

  if (x1 >= innerWidth - EDGE_TOLERANCE) {
    return {
      anchor: "start",
      maxChars: charsIn(margin.right),
      x: x1 + LABEL_INSET,
    };
  }

  return {
    anchor: "start",
    maxChars: charsIn(nextColumnStart(nodes, x1) - x1 - LABEL_INSET),
    x: x1 + LABEL_INSET,
  };
};

const NodeLabel = ({
  amount,
  isDimmed,
  node,
  placement,
}: {
  amount: string;
  isDimmed: boolean;
  node: PlacedNode;
  placement: LabelPlacement;
}) => {
  const y0 = node.y0 ?? 0;
  const height = (node.y1 ?? 0) - y0;
  const centerY = y0 + height / 2;
  const opacity = isDimmed ? DIMMED_OPACITY : 1;

  if (height >= TWO_LINE_MIN_H && placement.maxChars >= amount.length) {
    return (
      <g opacity={opacity}>
        <text
          className="fill-foreground stroke-card text-[11px] font-medium"
          dominantBaseline="central"
          strokeLinejoin="round"
          strokeWidth={3}
          style={HALO_STYLE}
          textAnchor={placement.anchor}
          x={placement.x}
          y={centerY - LINE_OFFSET}
        >
          {truncate(node.name, placement.maxChars)}
        </text>
        <text
          className="fill-muted-foreground stroke-card text-[10px]"
          dominantBaseline="central"
          strokeLinejoin="round"
          strokeWidth={3}
          style={HALO_STYLE}
          textAnchor={placement.anchor}
          x={placement.x}
          y={centerY + LINE_OFFSET}
        >
          {amount}
        </text>
      </g>
    );
  }

  const fitted = fitSideLabel(node.name, amount, placement.maxChars);

  if (fitted === null) {
    return null;
  }

  return (
    <text
      className="fill-foreground stroke-card text-[11px]"
      dominantBaseline="central"
      opacity={opacity}
      strokeLinejoin="round"
      strokeWidth={3}
      style={HALO_STYLE}
      textAnchor={placement.anchor}
      x={placement.x}
      y={centerY}
    >
      {fitted}
    </text>
  );
};

export const SankeyNodeLabels = ({
  formatValue,
  graph,
}: SankeyNodeLabelsProps) => {
  const { hoveredLinkIndex, hoveredNodeIndex, innerWidth, margin, nodes } =
    useSankey();

  const lit = litNodeIndexes(graph, hoveredNodeIndex, hoveredLinkIndex);
  const isAnyHovered = hoveredNodeIndex !== null || hoveredLinkIndex !== null;

  return (
    <g className="pointer-events-none">
      {nodes.map((node, index) => (
        <NodeLabel
          amount={formatValue(graph.nodes[index]?.amount ?? node.value ?? 0)}
          isDimmed={isAnyHovered && !lit.has(index)}
          key={`label-${node.index ?? index}`}
          node={node}
          placement={placementOf(node, nodes, innerWidth, margin)}
        />
      ))}
    </g>
  );
};
