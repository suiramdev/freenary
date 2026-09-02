import { cn } from "@freenary/ui/lib/utils";
import { useMemo, useState } from "react";

import { SankeyNodeLabel } from "@/components/shared/sankey-node-label";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import {
  ACCENT_W,
  computeSankeyLayout,
  svgLinkPath,
} from "@/lib/sankey/layout";
import type { SankeyFlow, SankeyLayout } from "@/lib/sankey/layout";

// Ribbons overlap each other and the nodes they join, so they stay translucent;
// the accent strips are near-solid so a node's edges read at any height.
const LINK_OPACITY = 0.28;
const NODE_OPACITY = 0.5;
const ACCENT_OPACITY = 0.85;
/** What everything unrelated to the hovered node fades to. */
const DIMMED = 0.25;

interface SankeyChartProps extends SankeyFlow {
  className?: string;
  /** Renders every node value; the chart itself is unit-agnostic. */
  formatValue: (value: number) => string;
  /** Names the flow for assistive tech, e.g. "Cash flow". */
  label: string;
  /** Fires when a node rectangle is clicked. */
  onNodeClick?: (nodeId: string) => void;
}

/** Hovering a node keeps that node, its ribbons, and their far ends lit. */
const activeIds = (layout: SankeyLayout, hovered: string | null) => {
  const ids = new Set<string>();
  if (!hovered) {
    return ids;
  }
  ids.add(hovered);
  for (const link of layout.links) {
    if (link.sourceId === hovered || link.targetId === hovered) {
      ids.add(link.sourceId);
      ids.add(link.targetId);
      ids.add(link.id);
    }
  }
  return ids;
};

/**
 * A sankey of a left-to-right column flow. Values and colors are given;
 * the chart holds no opinion about what they represent.
 */
export const SankeyChart = ({
  className,
  columns,
  formatValue,
  label,
  links,
  onNodeClick,
}: SankeyChartProps) => {
  const layout = useMemo(
    () => computeSankeyLayout({ columns, links }),
    [columns, links]
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const active = useMemo(() => activeIds(layout, hovered), [layout, hovered]);

  const lastColumn = layout.columnCount - 1;

  return (
    <svg
      aria-label={label}
      className={cn("block w-full select-none", className)}
      preserveAspectRatio="xMidYMid meet"
      style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
    >
      <title>{label}</title>
      {/* Hovering a ribbon lights the node it flows into — the specific
          category behind a group, the group behind an income source. Lighting
          the upstream end would only repeat what hovering that node shows. */}
      {layout.links.map((band) => (
        <path
          key={band.id}
          d={svgLinkPath(band)}
          fill={CHART_COLOR_VARS[band.color]}
          fillOpacity={
            LINK_OPACITY * (hovered && !active.has(band.id) ? DIMMED : 1)
          }
          onPointerEnter={() => setHovered(band.targetId)}
          onPointerLeave={() => setHovered(null)}
        />
      ))}

      {layout.nodes.map((node) => {
        const color = CHART_COLOR_VARS[node.color];
        const dim = hovered && !active.has(node.id) ? DIMMED : 1;
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
              fill={color}
              fillOpacity={NODE_OPACITY * dim}
              style={onNodeClick ? { cursor: "pointer" } : undefined}
              onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
              onPointerEnter={() => setHovered(node.id)}
              onPointerLeave={() => setHovered(null)}
            />
            {/* Accent bars mark where flow enters and leaves the node; they let
                the pointer through to the rectangle that carries the hover. */}
            {node.column !== lastColumn && (
              <rect
                className="pointer-events-none"
                x={node.x}
                y={node.y}
                width={ACCENT_W}
                height={node.h}
                fill={color}
                fillOpacity={ACCENT_OPACITY * dim}
              />
            )}
            {node.column !== 0 && (
              <rect
                className="pointer-events-none"
                x={node.x + node.w - ACCENT_W}
                y={node.y}
                width={ACCENT_W}
                height={node.h}
                fill={color}
                fillOpacity={ACCENT_OPACITY * dim}
              />
            )}
          </g>
        );
      })}

      {layout.nodes.map((node) => (
        <SankeyNodeLabel
          key={`label-${node.id}`}
          formatValue={formatValue}
          isFirstColumn={node.column === 0}
          node={node}
        />
      ))}
    </svg>
  );
};
