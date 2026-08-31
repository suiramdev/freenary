import { cn } from "@freenary/ui/lib/utils";
import { useMemo } from "react";

import { SankeyNodeLabel } from "@/components/shared/sankey-node-label";
import { useSankeyCanvas } from "@/hooks/shared/use-sankey-canvas";
import { computeSankeyLayout, svgLinkPath } from "@/lib/sankey/layout";
import type { SankeyFlow } from "@/lib/sankey/layout";

interface SankeyChartProps extends SankeyFlow {
  className?: string;
  /** Renders every node value; the chart itself is unit-agnostic. */
  formatValue: (value: number) => string;
  /** Names the flow for assistive tech, e.g. "Cash flow". */
  label: string;
  /** Fires when a node rectangle is clicked. */
  onNodeClick?: (nodeId: string) => void;
}

/**
 * A dithered sankey of a left-to-right column flow. Values and colors are given;
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

  const { canvasRef, setHovered } = useSankeyCanvas(layout);

  return (
    <div
      className={cn("relative", className)}
      style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />

      {/* SVG overlay — crisp text and pointer hit areas over the dither. */}
      <svg
        className="absolute inset-0 h-full w-full select-none"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label={label}
      >
        <title>{label}</title>
        {/* Hovering a ribbon lights the node it flows into — the specific
            category behind a group, the group behind an income source. Lighting
            the upstream end would only repeat what hovering that node shows. */}
        {layout.links.map((band) => (
          <path
            key={`hit-${band.id}`}
            d={svgLinkPath(band)}
            fill="transparent"
            onPointerEnter={() => setHovered(band.targetId)}
            onPointerLeave={() => setHovered(null)}
          />
        ))}

        {layout.nodes.map((node) => (
          <rect
            key={`hit-${node.id}`}
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            fill="transparent"
            style={onNodeClick ? { cursor: "pointer" } : undefined}
            onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
            onPointerEnter={() => setHovered(node.id)}
            onPointerLeave={() => setHovered(null)}
          />
        ))}

        {layout.nodes.map((node) => (
          <SankeyNodeLabel
            key={`label-${node.id}`}
            formatValue={formatValue}
            isFirstColumn={node.column === 0}
            node={node}
          />
        ))}
      </svg>
    </div>
  );
};
