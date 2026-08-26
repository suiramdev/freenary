"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@freenary/ui/lib/utils"
import { BAYER, CELL, BORDER_ALPHA, OFF_TIER, clamp01 } from "./dither-paint"
import { rgb, seedOfColor, type DitherColor } from "./palette"

type DitherProgressProps = {
  /** 0–1 fill fraction. */
  value: number
  color?: DitherColor
  className?: string
}

/**
 * Horizontal dithered progress bar. Dither applies only to the filled portion;
 * the empty track is a plain `bg-muted` div. On hover the dither brightens with
 * the same eased intensity lift the chart engine uses.
 */
export function DitherProgress({
  value,
  color = "blue",
  className,
}: DitherProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const rect = wrap.getBoundingClientRect()
    const cols = Math.max(4, Math.round(rect.width / CELL))
    const rows = Math.max(2, Math.round(rect.height / CELL))

    canvas.width = cols
    canvas.height = rows

    const octx = canvas.getContext("2d")
    if (!octx) return

    const seed = seedOfColor(color)
    const fillCols = Math.round(clamp01(value) * cols)

    let intensity = 0
    let raf = 0

    const paint = () => {
      octx.clearRect(0, 0, cols, rows)
      // Dissolve band at the fill edge — 3 columns that fade toward empty.
      const dissolve = Math.min(3, Math.max(1, Math.round(cols * 0.04)))

      for (let x = 0; x < fillCols; x++) {
        for (let y = 0; y < rows; y++) {
          const threshold = BAYER[y & 3][x & 3]
          const edgeDist = fillCols - x
          const edgeFade = edgeDist <= dissolve ? edgeDist / dissolve : 1
          const lit = edgeFade > threshold - 0.1 * intensity
          const k = (0.3 + edgeFade * 0.7) * (1 + 0.22 * intensity)
          const alpha = clamp01((lit ? k : k * OFF_TIER) * edgeFade)
          octx.fillStyle = rgb(seed.fill, 1, alpha)
          octx.fillRect(x, y, 1, 1)
        }
      }

      // Leading edge border
      if (fillCols > 0 && fillCols < cols) {
        const ex = fillCols - 1
        for (let y = 0; y < rows; y++) {
          octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA)
          octx.fillRect(ex, y, 1, 1)
        }
      }
    }

    const loop = () => {
      const target = hovered ? 1 : 0
      if (Math.abs(intensity - target) > 0.001) {
        intensity += (target - intensity) * 0.16
        paint()
        raf = requestAnimationFrame(loop)
      } else {
        intensity = target
        paint()
      }
    }

    // Initial paint + start easing loop
    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [value, color, hovered])

  return (
    <div
      ref={wrapRef}
      className={cn("bg-muted relative w-full overflow-hidden", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  )
}
