import { useEffect, useRef, useState } from "react";

import { CELL } from "@/lib/sankey/layout";
import type { SankeyLayout } from "@/lib/sankey/layout";
import { paintSankey } from "@/lib/sankey/paint";

const MIN_BACKING_SIZE = 8;

/**
 * Paints a sankey layout onto a low-resolution backing canvas (one dither
 * pixel per CELL user units) that CSS then scales up, and tracks the hovered
 * node so the paint can dim everything else.
 */
export const useSankeyCanvas = (layout: SankeyLayout) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const cols = Math.max(MIN_BACKING_SIZE, Math.round(layout.width / CELL));
  const rows = Math.max(MIN_BACKING_SIZE, Math.round(layout.height / CELL));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!(canvas && ctx)) {
      return;
    }
    canvas.width = cols;
    canvas.height = rows;
    paintSankey(ctx, {
      cols,
      fx: cols / layout.width,
      fy: rows / layout.height,
      hovered,
      layout,
      rows,
    });
  }, [layout, hovered, cols, rows]);

  return { canvasRef, hovered, setHovered };
};
