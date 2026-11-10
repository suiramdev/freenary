import {
  SankeyChart as FlowChart,
  SankeyLink as FlowLinks,
  SankeyNode as FlowNodes,
  useSankey,
} from "@freenary/ui/components/charts/sankey";
import type { SankeyContextValue } from "@freenary/ui/components/charts/sankey";
import { cn } from "@freenary/ui/lib/utils";
import { useCallback, useMemo } from "react";

import type { SankeyFlow } from "../../lib/sankey";
import { colorAt, toFlowGraph } from "./sankey-flow-data";
import type { FlowGraph } from "./sankey-flow-data";
import { SankeyFlowTooltip } from "./sankey-flow-tooltip";
import { SankeyNodeLabels } from "./sankey-node-label";

interface SankeyChartProps extends SankeyFlow {
  aspectRatio?: string;
  className?: string;
  formatValue: (value: number) => string;
  label: string;
  onNodeClick?: (nodeId: string) => void;
}

const DEFAULT_ASPECT_RATIO = "2 / 1";
const LABEL_ROOM_PX = 112;

const CHART_MARGIN = {
  bottom: 8,
  left: LABEL_ROOM_PX,
  right: LABEL_ROOM_PX,
  top: 8,
};

const NODE_WIDTH_PX = 12;
const NODE_PADDING_PX = 8;
const NODE_CORNER_RADIUS_PX = 2;
const LINK_OPACITY = 0.35;
const LINK_FADED_OPACITY = 0.08;
const NODE_FADED_OPACITY = 0.35;

const SankeyNodeTargets = ({
  graph,
  onNodeClick,
}: {
  graph: FlowGraph;
  onNodeClick: (nodeId: string) => void;
}) => {
  const { nodes, setHoveredNodeIndex, setTooltipData } = useSankey();

  return (
    <g>
      {nodes.map((node, index) => {
        const x0 = node.x0 ?? 0;
        const y0 = node.y0 ?? 0;

        return (
          <rect
            className="cursor-pointer"
            fill="transparent"
            height={(node.y1 ?? 0) - y0}
            key={`target-${node.index ?? index}`}
            onClick={() => {
              const target = graph.nodes[index];

              if (target) {
                onNodeClick(target.id);
              }
            }}
            onMouseEnter={() => {
              setHoveredNodeIndex(index);
              setTooltipData({
                data: node,
                nodeIndex: index,
                type: "node",
                x: 0,
                y: 0,
              });
            }}
            onMouseLeave={() => {
              setHoveredNodeIndex(null);
              setTooltipData(null);
            }}
            width={(node.x1 ?? 0) - x0}
            x={x0}
            y={y0}
          />
        );
      })}
    </g>
  );
};

export const SankeyChart = ({
  aspectRatio = DEFAULT_ASPECT_RATIO,
  className,
  columns,
  formatValue,
  label,
  links,
  onNodeClick,
}: SankeyChartProps) => {
  const graph = useMemo(
    () => toFlowGraph({ columns, links }),
    [columns, links]
  );

  const colorOfNode = useCallback(
    (_node: SankeyContextValue["nodes"][number], index: number) =>
      colorAt(graph, index),
    [graph]
  );

  return (
    <figure className={cn("w-full select-none", className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <FlowChart
        aspectRatio={aspectRatio}
        className="h-full"
        data={graph}
        margin={CHART_MARGIN}
        nodePadding={NODE_PADDING_PX}
        nodeWidth={NODE_WIDTH_PX}
      >
        <FlowLinks
          fadedOpacity={LINK_FADED_OPACITY}
          getNodeColor={colorOfNode}
          strokeOpacity={LINK_OPACITY}
        />
        <FlowNodes
          fadedOpacity={NODE_FADED_OPACITY}
          getNodeColor={colorOfNode}
          lineCap={NODE_CORNER_RADIUS_PX}
          showLabels={false}
        />
        <SankeyNodeLabels formatValue={formatValue} graph={graph} />
        {onNodeClick && (
          <SankeyNodeTargets graph={graph} onNodeClick={onNodeClick} />
        )}
        <SankeyFlowTooltip formatValue={formatValue} graph={graph} />
      </FlowChart>
    </figure>
  );
};
