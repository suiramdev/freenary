import type { CategoryColor } from "@freenary/api/lib/taxonomy";

/** One node of a flow: each column feeds the next. */
export interface SankeyNode {
  color: CategoryColor;
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
  links: SankeyLink[];
}

/** A laid-out node, in chart user units. */
export interface NodeRect {
  color: CategoryColor;
  column: number;
  h: number;
  id: string;
  label: string;
  /** Width a side label may use, once any contested gap has been split. */
  labelBudget: number;
  value: number;
  w: number;
  x: number;
  y: number;
}

/** A laid-out link: a ribbon from `sx`/`sy0`–`sy1` to `tx`/`ty0`–`ty1`. */
export interface LinkBand {
  color: CategoryColor;
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
  height: number;
  links: LinkBand[];
  nodes: NodeRect[];
  width: number;
}

export const CHART_WIDTH = 700;
/** Width of the accent strip on the face where flow enters or leaves a node. */
export const ACCENT_W = 3;
/** Below this node height the label no longer fits inside the node. */
export const LABEL_MIN_H = 28;
/** Breathing room between a node and a label set beside it. */
export const LABEL_INSET = 6;

const PAD = { bottom: 16, left: 12, right: 12, top: 20 };
/** Column width and inter-column gap as fractions of the usable width. Any
 *  column count is normalised to fill that width, so a four-column flow simply
 *  gets proportionally narrower columns and gaps. */
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
    rects.push({ ...node, column, h, labelBudget: 0, w, x, y });
    y += h + NODE_GAP;
  }
  return { bottom: y, rects };
};

/** A link's share of one of its endpoints, guarded against a zero-valued node. */
const sliceOf = (value: number, node: NodeRect) =>
  node.value > 0
    ? Math.max(MIN_BAND_H, (value / node.value) * node.h)
    : MIN_BAND_H;

/** A node too short to hold its label inside sets it beside itself instead. */
const isShort = (rect: NodeRect) => rect.h < LABEL_MIN_H;

const sharesRows = (a: NodeRect, b: NodeRect) =>
  a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Lays out a left-to-right column flow in user units.
 * Values drive heights; nothing here knows what the values mean.
 */
export const computeSankeyLayout = ({
  columns,
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

  // A short node writes its label into the gap beside it: column 0 rightwards,
  // every other column leftwards. Only columns 0 and 1 can therefore aim at the
  // same gap, and only where their labels also share rows — the one case that
  // has to give up half the width.
  const rightWriters = nodes.filter(
    (rect) => rect.column === 0 && isShort(rect)
  );
  const leftWriters = nodes.filter(
    (rect) => rect.column === 1 && isShort(rect)
  );
  for (const rect of nodes) {
    let rivals: NodeRect[] = [];
    if (rect.column === 0) {
      rivals = leftWriters;
    } else if (rect.column === 1) {
      rivals = rightWriters;
    }
    const contested = rivals.some((rival) => sharesRows(rect, rival));
    const share = contested ? gapW / 2 : gapW;
    // Writing rightwards, the chart edge binds too when no column follows.
    const room =
      rect.column === 0 ? CHART_WIDTH - PAD.right - (rect.x + rect.w) : share;
    rect.labelBudget = Math.max(0, Math.min(share, room) - LABEL_INSET);
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
      // The budget preview feeds 0 for an amount still being typed; a band
      // here would render an empty ribbon and burn a port on both nodes.
      if (link.value <= 0) {
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
    height: bottom + PAD.bottom,
    links: bands,
    nodes,
    width: CHART_WIDTH,
  };
};
