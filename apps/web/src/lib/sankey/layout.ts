import type { DitherColor } from "@/components/dither-kit/palette";

/** One node of a flow: sources feed a hub, the hub feeds targets. */
export interface SankeyNode {
  color: DitherColor;
  id: string;
  label: string;
  value: number;
}

/** A flow between two nodes, addressed by `SankeyNode.id`. */
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyFlow {
  hub: SankeyNode;
  links: SankeyLink[];
  sources: SankeyNode[];
  targets: SankeyNode[];
}

/** A laid-out node, in chart user units. */
export interface NodeRect {
  color: DitherColor;
  column: 0 | 1 | 2;
  h: number;
  id: string;
  label: string;
  value: number;
  w: number;
  x: number;
  y: number;
}

/** A laid-out link: a ribbon from `sx`/`sy0`–`sy1` to `tx`/`ty0`–`ty1`. */
export interface LinkBand {
  color: DitherColor;
  id: string;
  sourceId: string;
  sx: number;
  sy0: number;
  sy1: number;
  targetId: string;
  tx: number;
  ty0: number;
  ty1: number;
}

export interface SankeyLayout {
  height: number;
  hubId: string;
  links: LinkBand[];
  nodes: NodeRect[];
  width: number;
}

export const CHART_WIDTH = 700;
/** Backing-canvas cell size: one dither pixel per CELL user units. */
export const CELL = 3;
export const ACCENT_W = 3;
/** Below this node height the label no longer fits inside the node. */
export const LABEL_MIN_H = 28;

const PAD = { bottom: 16, left: 12, right: 12, top: 20 };
const COL_FRAC = 0.22;
const NODE_GAP = 6;
const MIN_NODE_H = 16;
const MAX_COL_H = 260;
const MIN_BAND_H = 2;

const sumOf = (nodes: SankeyNode[]) =>
  nodes.reduce((total, node) => total + node.value, 0);

export const svgLinkPath = (band: LinkBand): string => {
  const mx = (band.sx + band.tx) / 2;
  return [
    `M${band.sx},${band.sy0}`,
    `C${mx},${band.sy0} ${mx},${band.ty0} ${band.tx},${band.ty0}`,
    `L${band.tx},${band.ty1}`,
    `C${mx},${band.ty1} ${mx},${band.sy1} ${band.sx},${band.sy1}`,
    "Z",
  ].join(" ");
};

const stackColumn = (
  nodes: SankeyNode[],
  column: 0 | 2,
  x: number,
  w: number,
  maxValue: number
) => {
  const rects: NodeRect[] = [];
  let y = PAD.top;
  for (const node of nodes) {
    const h = Math.max(MIN_NODE_H, (node.value / maxValue) * MAX_COL_H);
    rects.push({ ...node, column, h, w, x, y });
    y += h + NODE_GAP;
  }
  return { bottom: y, rects };
};

/**
 * Lays out a three-column flow (sources → hub → targets) in user units.
 * Values drive heights; nothing here knows what the values mean.
 */
export const computeSankeyLayout = ({
  hub,
  links,
  sources,
  targets,
}: SankeyFlow): SankeyLayout => {
  const usable = CHART_WIDTH - PAD.left - PAD.right;
  const colW = usable * COL_FRAC;
  const gapW = (usable - 3 * colW) / 2;

  const sourceX = PAD.left;
  const hubX = sourceX + colW + gapW;
  const targetX = hubX + colW + gapW;

  const maxValue = Math.max(hub.value, sumOf(targets), 1);

  const sourceColumn = stackColumn(sources, 0, sourceX, colW, maxValue);
  const targetColumn = stackColumn(targets, 2, targetX, colW, maxValue);

  const hubRect: NodeRect = {
    ...hub,
    column: 1,
    h: Math.max(MIN_NODE_H, (hub.value / maxValue) * MAX_COL_H),
    w: colW,
    x: hubX,
    y: PAD.top,
  };

  const nodeById = new Map(
    [...sourceColumn.rects, ...targetColumn.rects].map((rect) => [
      rect.id,
      rect,
    ])
  );

  // Each side of the hub stacks its own ribbons; a source also stacks the
  // ribbons leaving it, so several links out of one node never overlap.
  const bands: LinkBand[] = [];
  const sourcePorts = new Map<string, number>();
  let hubInPort = 0;
  let hubOutPort = 0;

  for (const link of links) {
    const hubSlice = Math.max(MIN_BAND_H, (link.value / maxValue) * MAX_COL_H);

    if (link.target === hub.id) {
      const source = nodeById.get(link.source);
      if (!source) {
        continue;
      }
      const port = sourcePorts.get(source.id) ?? 0;
      const slice = Math.max(
        MIN_BAND_H,
        (link.value / source.value) * source.h
      );
      sourcePorts.set(source.id, port + slice);
      bands.push({
        color: source.color,
        id: `${link.source}→${link.target}`,
        sourceId: source.id,
        sx: source.x + source.w,
        sy0: source.y + port,
        sy1: source.y + port + slice,
        targetId: hubRect.id,
        tx: hubRect.x,
        ty0: hubRect.y + hubInPort,
        ty1: hubRect.y + hubInPort + hubSlice,
      });
      hubInPort += hubSlice;
      continue;
    }

    if (link.source === hub.id) {
      const target = nodeById.get(link.target);
      if (!target) {
        continue;
      }
      bands.push({
        color: target.color,
        id: `${link.source}→${link.target}`,
        sourceId: hubRect.id,
        sx: hubRect.x + hubRect.w,
        sy0: hubRect.y + hubOutPort,
        sy1: hubRect.y + hubOutPort + hubSlice,
        targetId: target.id,
        tx: target.x,
        ty0: target.y,
        ty1: target.y + target.h,
      });
      hubOutPort += hubSlice;
    }
  }

  return {
    height:
      Math.max(
        sourceColumn.bottom,
        targetColumn.bottom,
        hubRect.y + hubRect.h
      ) + PAD.bottom,
    hubId: hubRect.id,
    links: bands,
    nodes: [...sourceColumn.rects, hubRect, ...targetColumn.rects],
    width: CHART_WIDTH,
  };
};
