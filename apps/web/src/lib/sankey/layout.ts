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
  /** Node columns, left to right. Links may only join adjacent columns. */
  columns: SankeyNode[][];
  /** Node whose label is drawn above it instead of inside, e.g. the budget hub. */
  emphasizedId?: string;
  links: SankeyLink[];
}

/** A laid-out node, in chart user units. */
export interface NodeRect {
  color: DitherColor;
  column: number;
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
  columnCount: number;
  emphasizedId?: string;
  height: number;
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
/** Column width and inter-column gap as fractions of the usable width. A three-column
 *  flow fills it exactly, which is why the existing cash-flow chart does not move. */
const COL_FRAC = 0.22;
const GAP_FRAC = 0.17;
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
  column: number,
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

/** A link's share of one of its endpoints, guarded against a zero-valued node. */
const sliceOf = (value: number, node: NodeRect) =>
  node.value > 0
    ? Math.max(MIN_BAND_H, (value / node.value) * node.h)
    : MIN_BAND_H;

/**
 * Lays out a left-to-right column flow in user units.
 * Values drive heights; nothing here knows what the values mean.
 */
export const computeSankeyLayout = ({
  columns,
  emphasizedId,
  links,
}: SankeyFlow): SankeyLayout => {
  const usable = CHART_WIDTH - PAD.left - PAD.right;
  const columnCount = Math.max(1, columns.length);
  const scale =
    1 / (columnCount * COL_FRAC + Math.max(0, columnCount - 1) * GAP_FRAC);
  const colW = usable * COL_FRAC * scale;
  const gapW = usable * GAP_FRAC * scale;

  const maxValue = Math.max(1, ...columns.map(sumOf));

  const nodes: NodeRect[] = [];
  let bottom = PAD.top;
  for (const [index, column] of columns.entries()) {
    const stacked = stackColumn(
      column,
      index,
      PAD.left + index * (colW + gapW),
      colW,
      maxValue
    );
    nodes.push(...stacked.rects);
    bottom = Math.max(bottom, stacked.bottom);
  }

  const nodeById = new Map(nodes.map((rect) => [rect.id, rect]));
  const outgoing = new Map<string, SankeyLink[]>();
  for (const link of links) {
    const forSource = outgoing.get(link.source);
    if (forSource) {
      forSource.push(link);
    } else {
      outgoing.set(link.source, [link]);
    }
  }

  // Walking nodes column by column, then each node's links in order, stacks every
  // ribbon on both faces so links leaving or entering one node never overlap.
  const bands: LinkBand[] = [];
  const outPort = new Map<string, number>();
  const inPort = new Map<string, number>();

  for (const rect of nodes) {
    for (const link of outgoing.get(rect.id) ?? []) {
      const target = nodeById.get(link.target);
      if (!target || target.column !== rect.column + 1) {
        continue;
      }

      const sourceSlice = sliceOf(link.value, rect);
      const targetSlice = sliceOf(link.value, target);
      const sourceOffset = outPort.get(rect.id) ?? 0;
      const targetOffset = inPort.get(target.id) ?? 0;

      bands.push({
        color: rect.column === 0 ? rect.color : target.color,
        id: `${link.source}→${link.target}`,
        sourceId: rect.id,
        sx: rect.x + rect.w,
        sy0: rect.y + sourceOffset,
        sy1: rect.y + sourceOffset + sourceSlice,
        targetId: target.id,
        tx: target.x,
        ty0: target.y + targetOffset,
        ty1: target.y + targetOffset + targetSlice,
      });

      outPort.set(rect.id, sourceOffset + sourceSlice);
      inPort.set(target.id, targetOffset + targetSlice);
    }
  }

  return {
    columnCount,
    emphasizedId,
    height: bottom + PAD.bottom,
    links: bands,
    nodes,
    width: CHART_WIDTH,
  };
};
