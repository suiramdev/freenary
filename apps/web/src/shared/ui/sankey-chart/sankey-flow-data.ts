import type {
  SankeyLinkDatum,
  SankeyNodeDatum,
} from "@freenary/ui/components/charts/sankey";

import type { SankeyFlow } from "../../lib/sankey";

export interface FlowNodeDatum extends SankeyNodeDatum {
  amount: number;
  color: string;
  id: string;
}

export interface FlowLinkDatum extends SankeyLinkDatum {
  source: number;
  target: number;
}

export interface FlowGraph {
  links: FlowLinkDatum[];
  nodes: FlowNodeDatum[];
}

const FALLBACK_COLOR = "var(--chart-grey)";

export const toFlowGraph = ({ columns, links }: SankeyFlow): FlowGraph => {
  const nodes: FlowNodeDatum[] = columns.flatMap((column) =>
    column.map((node) => ({
      amount: node.value,
      color: node.color,
      id: node.id,
      name: node.label,
    }))
  );

  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const flowLinks: FlowLinkDatum[] = [];

  for (const link of links) {
    const source = indexById.get(link.source);
    const target = indexById.get(link.target);

    if (source !== undefined && target !== undefined && link.value > 0) {
      flowLinks.push({ source, target, value: link.value });
    }
  }

  return { links: flowLinks, nodes };
};

export const colorAt = (graph: FlowGraph, index: number | undefined) =>
  graph.nodes[index ?? -1]?.color ?? FALLBACK_COLOR;

export const litNodeIndexes = (
  graph: FlowGraph,
  hoveredNodeIndex: number | null,
  hoveredLinkIndex: number | null
) => {
  const lit = new Set<number>();

  if (hoveredNodeIndex !== null) {
    lit.add(hoveredNodeIndex);

    for (const link of graph.links) {
      if (
        link.source === hoveredNodeIndex ||
        link.target === hoveredNodeIndex
      ) {
        lit.add(link.source);
        lit.add(link.target);
      }
    }
  }

  const hoveredLink =
    hoveredLinkIndex === null ? undefined : graph.links[hoveredLinkIndex];

  if (hoveredLink) {
    lit.add(hoveredLink.source);
    lit.add(hoveredLink.target);
  }

  return lit;
};
