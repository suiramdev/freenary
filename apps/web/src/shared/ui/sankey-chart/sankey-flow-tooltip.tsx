import { useSankey } from "@freenary/ui/components/charts/sankey";
import {
  TooltipBox,
  TooltipContent,
} from "@freenary/ui/components/charts/tooltip";
import type { TooltipRow } from "@freenary/ui/components/charts/tooltip";

import type { FlowGraph } from "./sankey-flow-data";

interface SankeyFlowTooltipProps {
  formatValue: (value: number) => string;
  graph: FlowGraph;
}

interface TooltipBody {
  rows: TooltipRow[];
  title?: string;
}

const NO_INDEX = -1;

const bodyOf = (
  graph: FlowGraph,
  formatValue: (value: number) => string,
  hovered: ReturnType<typeof useSankey>["tooltipData"]
): TooltipBody | null => {
  if (hovered?.type === "node") {
    const node = graph.nodes[hovered.nodeIndex ?? NO_INDEX];

    return node
      ? {
          rows: [
            {
              color: node.color,
              label: node.name,
              value: formatValue(node.amount),
            },
          ],
        }
      : null;
  }

  const link = graph.links[hovered?.linkIndex ?? NO_INDEX];
  const source = link ? graph.nodes[link.source] : undefined;
  const target = link ? graph.nodes[link.target] : undefined;

  if (!(link && source && target)) {
    return null;
  }

  return {
    rows: [
      {
        color: target.color,
        label: target.name,
        value: formatValue(link.value),
      },
    ],
    title: source.name,
  };
};

export const SankeyFlowTooltip = ({
  formatValue,
  graph,
}: SankeyFlowTooltipProps) => {
  const { containerRef, height, margin, mousePos, tooltipData, width } =
    useSankey();

  const body = bodyOf(graph, formatValue, tooltipData);

  return (
    <TooltipBox
      containerHeight={height}
      containerRef={containerRef}
      containerWidth={width}
      visible={body !== null}
      x={mousePos?.x ?? margin.left}
      y={mousePos?.y ?? margin.top}
    >
      {body && <TooltipContent rows={body.rows} title={body.title} />}
    </TooltipBox>
  );
};
