import { BrandAvatar } from "@freenary/ui/components/brand-avatar";
import { Button } from "@freenary/ui/components/button";
import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import {
  BRAND_AVATAR_STATES,
  stateTransition,
} from "@freenary/ui/lib/brand-avatar/states";
import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import * as React from "react";

/**
 * TEMPORARY dev-only state board for the brand avatar. Not linked from the
 * app, not in the message catalogs, and meant to be deleted — it exists to
 * eyeball every expression animating at once, and to watch the main demo morph
 * between two of them, which no still frame shows.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const CYCLE_MS = 1600;
const GRID_SIZES = [16, 24, 40, 56, 88, 128] as const;
const DEMO_SIZES = [56, 88, 176, 240, 320] as const;

const DevAvatarPage = () => {
  const [demo, setDemo] = React.useState<BrandAvatarState>("logo");
  const [previous, setPrevious] = React.useState<BrandAvatarState | null>(null);
  const [demoSize, setDemoSize] = React.useState<number>(240);
  const [gridSize, setGridSize] = React.useState<number>(72);
  const [cycling, setCycling] = React.useState(false);
  const [replay, setReplay] = React.useState(0);
  const { setTheme, resolvedTheme } = useTheme();

  const reduced = React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  );

  const morphTo = (state: BrandAvatarState) => {
    setPrevious((current) => (state === demo ? current : demo));
    setDemo(state);
  };

  // Walking every state on a timer drives the demo through all 19 blends
  // back to back — the fastest way to catch a morph that pops or smears.
  React.useEffect(() => {
    if (!cycling) {
      return;
    }
    const step = setInterval(() => {
      setDemo((current) => {
        setPrevious(current);
        const next = BRAND_AVATAR_STATES.indexOf(current) + 1;
        return BRAND_AVATAR_STATES[next % BRAND_AVATAR_STATES.length];
      });
    }, CYCLE_MS);
    return () => clearInterval(step);
  }, [cycling]);

  return (
    <div className="bg-background text-foreground min-h-screen p-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-heading mr-auto text-lg font-semibold">
          brand avatar — {BRAND_AVATAR_STATES.length} states
          <span className="text-muted-foreground ml-2 font-mono text-xs font-normal">
            temporary /dev-avatar — click a cell to morph the demo
          </span>
        </h1>
        <Button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          size="sm"
          variant="outline"
        >
          {resolvedTheme === "dark" ? "light" : "dark"}
        </Button>
        <Button
          onClick={() => setCycling((on) => !on)}
          size="sm"
          variant={cycling ? "default" : "outline"}
        >
          {cycling ? "morphing all" : "morph all"}
        </Button>
        {reduced && (
          <span className="text-destructive font-mono text-xs">
            prefers-reduced-motion: reduce — loops are off, frames are frozen
          </span>
        )}
      </header>

      {/* The demo avatar is never remounted: a fresh mount would restart the
          engine instead of blending, which is exactly what this page tests. */}
      <section className="border-border mb-6 flex flex-wrap items-center gap-8 rounded-xl border p-6">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ height: demoSize, width: demoSize }}
        >
          <BrandAvatar
            label={`brand avatar, ${demo}`}
            size={demoSize}
            state={demo}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm">
            {previous ? `${previous} → ` : ""}
            <span className="font-semibold">{demo}</span>
          </p>
          <p className="text-muted-foreground font-mono text-xs">
            blend {stateTransition(demo).toFixed(2)}s
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {DEMO_SIZES.map((preset) => (
              <Button
                key={preset}
                onClick={() => setDemoSize(preset)}
                size="sm"
                variant={demoSize === preset ? "default" : "ghost"}
              >
                {preset}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {BRAND_AVATAR_STATES.map((state) => (
              <Button
                key={state}
                onClick={() => morphTo(state)}
                size="xs"
                variant={state === demo ? "default" : "outline"}
              >
                {state}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground mr-auto font-mono text-xs">
          every state, live — click one to morph the demo above
        </span>
        {GRID_SIZES.map((preset) => (
          <Button
            key={preset}
            onClick={() => setGridSize(preset)}
            size="sm"
            variant={gridSize === preset ? "default" : "ghost"}
          >
            {preset}
          </Button>
        ))}
        <Button
          onClick={() => setReplay((n) => n + 1)}
          size="sm"
          variant="outline"
        >
          replay grid
        </Button>
      </div>

      {/* Remounting on `replay` restarts every grid clock at once, so the
          one-shot accents (surprise pop, error shake) replay together. */}
      <section
        className="grid gap-3"
        key={replay}
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize + 56}px, 1fr))`,
        }}
      >
        {BRAND_AVATAR_STATES.map((state) => (
          <button
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition-colors ${
              state === demo
                ? "border-primary bg-muted"
                : "border-border hover:bg-muted/40"
            }`}
            key={state}
            onClick={() => morphTo(state)}
            type="button"
          >
            <div className="flex items-center" style={{ height: gridSize }}>
              <BrandAvatar size={gridSize} state={state} />
            </div>
            <span className="font-mono text-[0.65rem]">{state}</span>
            <span className="text-muted-foreground font-mono text-[0.6rem]">
              {stateTransition(state).toFixed(2)}s
            </span>
          </button>
        ))}
      </section>
    </div>
  );
};

export const Route = createFileRoute("/dev-avatar")({
  component: DevAvatarPage,
});
