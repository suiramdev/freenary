"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";

import { useRevision } from "./chart-context";
import type {
  AreaVariant,
  ChartConfig,
  ChartType,
  Margins,
} from "./chart-context";
import type { CommonChart } from "./common-context";
import type { BloomInput } from "./dither-paint";
import type { Seed } from "./palette";
import { seedOfColor } from "./palette";
import { pieSlices, radarAxes } from "./polar";
import type { PieSlice, RadarAxis } from "./polar";
import type { Dimensions } from "./use-chart-dimensions";

type Row = Record<string, unknown>;

const ROOT_OF: Record<string, string> = {
  pie: "<PieChart />",
  radar: "<RadarChart />",
};

export interface PolarChartContextValue {
  chartType: ChartType;
  config: ChartConfig;
  configKeys: string[];
  data: Row[];
  dataLength: number;
  ready: boolean;
  plot: { width: number; height: number };
  margins: Margins;
  center: { x: number; y: number };
  outerRadius: number;
  innerRadius: number;
  animate: boolean;
  animationDuration: number;
  revision: number;
  bloom: BloomInput;
  bloomOnHover: boolean;

  seedOf: (key: string) => Seed;
  variantOf: (key: string) => AreaVariant;
  registerVariant: (key: string, variant: AreaVariant) => void;
  unregisterVariant: (key: string) => void;

  selectedDataKey: string | null;
  selectDataKey: (key: string | null) => void;
  /** Legend-hover spotlight — dims every series but this one while set. */
  focusDataKey: string | null;
  setFocusDataKey: (key: string | null) => void;
  hoverIndex: number | null;
  setHoverIndex: (i: number | null) => void;
  setCursor: (px: number, py: number) => void;
  isMouseInChart: boolean;
  setMouseInChart: (over: boolean) => void;

  pie: PieSlice[] | null; // present for pie charts
  radar: { axes: RadarAxis[]; max: number } | null; // present for radar charts

  common: CommonChart;
}

const PolarChartContext = createContext<PolarChartContextValue | null>(null);

export function usePolarChart() {
  const ctx = use(PolarChartContext);
  if (!ctx) {
    throw new Error(
      "Polar chart parts must be used within a polar chart root."
    );
  }
  return ctx;
}

/** Boundary guard for polar parts (`<Pie>`, `<Radar>`). */
export function usePolarPart(part: string, kind: "pie" | "radar") {
  const ctx = use(PolarChartContext);
  if (!ctx) {
    throw new Error(`<${part} /> must be used within ${ROOT_OF[kind]}.`);
  }
  if (ctx.chartType !== kind) {
    throw new Error(
      `<${part} /> is not valid inside ${ROOT_OF[ctx.chartType]} — it belongs in ${ROOT_OF[kind]}.`
    );
  }
  return ctx;
}

export { PolarChartContext };

export function usePolarController({
  chartType,
  data,
  config,
  dataKey,
  nameKey,
  innerRadiusRatio,
  dimensions,
  margins,
  animate = true,
  animationDuration = 900,
  replayToken = 0,
  bloom = "off",
  bloomOnHover = false,
  defaultSelectedDataKey = null,
  onSelectionChange,
}: {
  chartType: "pie" | "radar";
  data: Row[];
  config: ChartConfig;
  dataKey: string;
  nameKey: string;
  innerRadiusRatio: number;
  dimensions: Dimensions;
  margins: Margins;
  animate?: boolean;
  animationDuration?: number;
  replayToken?: number;
  bloom?: BloomInput;
  bloomOnHover?: boolean;
  defaultSelectedDataKey?: string | null;
  onSelectionChange?: (key: string | null) => void;
}): PolarChartContextValue {
  // This object becomes the PolarChartContext value, so its identity — and the
  // identity of every function/object it carries — must stay stable across
  // renders that don't change the inputs; otherwise every consumer (legend,
  // tooltip, slices, axes) re-renders on every parent render. The expensive
  // derivations, exposed callbacks, and returned value are memoized below;
  // cheap scalars (radii, ready) are left bare as plain recomputed reads.

  // Memoized: drives `pie`/`radar`/`common` — a fresh array would bust them.
  const configKeys = useMemo(() => Object.keys(config), [config]);
  const revision = useRevision(data, replayToken);

  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(
    defaultSelectedDataKey
  );
  const [focusDataKey, setFocusDataKey] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [isMouseInChart, setMouseInChart] = useState(false);
  // Stable (only wraps two useState setters) so the value keeps its identity.
  const setCursor = useCallback((px: number, py: number) => {
    setCursorX(px);
    setCursorY(py);
  }, []);
  const [variants, setVariants] = useState<Record<string, AreaVariant>>({});

  // useCallback for the same reason as registerSeries in chart-context.tsx:
  // pie.tsx/radar.tsx list these as effect deps, so without stable identities
  // the unregister/register effect re-fires and its setState pair loops.
  const registerVariant = useCallback((key: string, variant: AreaVariant) => {
    setVariants((prev) =>
      prev[key] === variant ? prev : { ...prev, [key]: variant }
    );
  }, []);
  const unregisterVariant = useCallback((key: string) => {
    setVariants((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Stable so the value keeps its identity; re-created only on config change.
  const selectDataKey = useCallback(
    (key: string | null) => {
      setSelectedDataKey(key);
      onSelectionChange?.(key);
    },
    [onSelectionChange]
  );

  // The root spreads margins fresh every render; pin a stable object off the
  // four numbers so it doesn't, on its own, invalidate the value.
  const { top: mTop, right: mRight, bottom: mBottom, left: mLeft } = margins;
  const stableMargins = useMemo(
    () => ({ bottom: mBottom, left: mLeft, right: mRight, top: mTop }),
    [mTop, mRight, mBottom, mLeft]
  );

  const plotWidth = Math.max(0, dimensions.width - mLeft - mRight);
  const plotHeight = Math.max(0, dimensions.height - mTop - mBottom);
  const ready = plotWidth > 0 && plotHeight > 0;
  const pad = chartType === "radar" ? 20 : 6;
  const outerRadius = Math.max(0, Math.min(plotWidth, plotHeight) / 2 - pad);
  const innerRadius = chartType === "pie" ? outerRadius * innerRadiusRatio : 0;
  const centerX = plotWidth / 2;
  const centerY = plotHeight / 2;

  // Stable so `common` and the value stay stable; re-created only on config.
  const seedOf = useCallback(
    (key: string) => seedOfColor(config[key]?.color ?? "grey"),
    [config]
  );
  // "*" is the pie-wide variant set by <Pie>; radar registers per series key.
  const variantOf = useCallback(
    (key: string) => variants[key] ?? variants["*"] ?? "gradient",
    [variants]
  );

  // Memoized: slice geometry — recomputing it on every hover/cursor tick would
  // rebuild the pie layout needlessly.
  const pie = useMemo(
    () => (chartType === "pie" ? pieSlices(data, dataKey, nameKey) : null),
    [chartType, data, dataKey, nameKey]
  );

  // Memoized: walks every row × series for the axis max, then builds the axes.
  const radar = useMemo(() => {
    if (chartType !== "radar") {
      return null;
    }
    let max = 0;
    for (const row of data) {
      for (const key of configKeys) {
        const v = Number(row[key]) || 0;
        if (v > max) {
          max = v;
        }
      }
    }
    return { axes: radarAxes(data, nameKey), max: max || 1 };
  }, [chartType, data, configKeys, nameKey]);

  // Memoized: this is the value handed to CommonChartContext (Legend/Tooltip),
  // so it needs its own stable identity independent of the parent value.
  const common: CommonChart = useMemo<CommonChart>(() => {
    const tooltipLeft = Math.max(48, Math.min(plotWidth + mLeft - 48, cursorX));
    const tooltipTop = Math.max(mTop + 44, cursorY);
    const emphasis = selectedDataKey ?? focusDataKey;
    if (chartType === "pie" && pie) {
      const names = pie.map((s) => s.name);
      return {
        focusDataKey,
        heading: (i) => pie[i]?.name ?? null,
        hoverIndex,
        itemsAt: (i) => {
          const s = pie[i];
          if (!s) {
            return [];
          }
          return [
            {
              dimmed: emphasis !== null && emphasis !== s.name,
              label: config[s.name]?.label ?? s.name,
              name: s.name,
              seed: seedOf(s.name),
              value: s.value,
            },
          ];
        },
        labelOf: (n) => config[n]?.label ?? n,
        names,
        ready,
        seedOf,
        selectDataKey,
        selectedDataKey,
        setFocusDataKey,
        tooltipLeft,
        tooltipTop,
      };
    }
    // radar
    return {
      focusDataKey,
      heading: (i) => radar?.axes[i]?.label ?? null,
      hoverIndex,
      itemsAt: (i) =>
        configKeys.map((name) => {
          const raw = data[i]?.[name];
          return {
            dimmed: emphasis !== null && emphasis !== name,
            label: config[name]?.label ?? name,
            name,
            seed: seedOf(name),
            value: typeof raw === "number" ? raw : 0,
          };
        }),
      labelOf: (n) => config[n]?.label ?? n,
      names: configKeys,
      ready,
      seedOf,
      selectDataKey,
      selectedDataKey,
      setFocusDataKey,
      tooltipLeft,
      tooltipTop,
    };
  }, [
    chartType,
    config,
    configKeys,
    data,
    pie,
    radar,
    seedOf,
    selectedDataKey,
    selectDataKey,
    focusDataKey,
    setFocusDataKey,
    hoverIndex,
    ready,
    plotWidth,
    mLeft,
    mTop,
    cursorX,
    cursorY,
  ]);

  // Memoized: this is the PolarChartContext value. A fresh object here would
  // re-render every consumer on every parent render — the reason the pieces
  // above are stabilized. Rebuilds only when a listed input changes. The
  // useState setters are listed but never change identity.
  return useMemo<PolarChartContextValue>(
    () => ({
      animate,
      animationDuration,
      bloom,
      bloomOnHover,
      center: { x: centerX, y: centerY },
      chartType,
      common,
      config,
      configKeys,
      data,
      dataLength: data.length,
      focusDataKey,
      hoverIndex,
      innerRadius,
      isMouseInChart,
      margins: stableMargins,
      outerRadius,
      pie,
      plot: { height: plotHeight, width: plotWidth },
      radar,
      ready,
      registerVariant,
      revision,
      seedOf,
      selectDataKey,
      selectedDataKey,
      setCursor,
      setFocusDataKey,
      setHoverIndex,
      setMouseInChart,
      unregisterVariant,
      variantOf,
    }),
    [
      chartType,
      config,
      configKeys,
      data,
      ready,
      plotWidth,
      plotHeight,
      stableMargins,
      centerX,
      centerY,
      outerRadius,
      innerRadius,
      animate,
      animationDuration,
      revision,
      bloom,
      bloomOnHover,
      seedOf,
      variantOf,
      registerVariant,
      unregisterVariant,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      setCursor,
      isMouseInChart,
      setMouseInChart,
      pie,
      radar,
      common,
    ]
  );
}
