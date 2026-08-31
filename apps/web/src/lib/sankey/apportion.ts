import type { SankeyLink } from "@/lib/sankey/layout";

export interface FlowEnd {
  id: string;
  value: number;
}

/**
 * Links sources to targets by filling each target in turn from the sources in
 * order, so a target draws from as few sources as possible.
 *
 * Money is fungible, so no apportionment is more "true" than another — but
 * linking every source to every target needs N×M ribbons for the same totals
 * and reads as a wash. Filling in order needs at most N+M-1.
 *
 * Sources are consumed in the order given. When they run short the trailing
 * targets get no ribbon, which is what an overspent period looks like.
 */
export const apportion = (
  sources: FlowEnd[],
  targets: FlowEnd[]
): SankeyLink[] => {
  const links: SankeyLink[] = [];
  let sourceIndex = 0;
  let remainingInSource = sources[0]?.value ?? 0;

  for (const target of targets) {
    // An unmeasurable target gets no ribbon. Left as Infinity it would pair with
    // an infinite source to emit a non-finite value, and the layout does
    // arithmetic on that.
    let unfilled = Number.isFinite(target.value) ? target.value : 0;
    while (unfilled > 0 && sourceIndex < sources.length) {
      const source = sources[sourceIndex];
      // A source that cannot contribute — zero, negative or not a number — is
      // skipped rather than retried. Retrying would spin forever on NaN, whose
      // comparisons are false in both directions.
      if (!source || !(remainingInSource > 0)) {
        sourceIndex += 1;
        remainingInSource = sources[sourceIndex]?.value ?? 0;
        continue;
      }
      // Bounded by a finite target, so every ribbon carries real, finite flow.
      const taken = Math.min(unfilled, remainingInSource);
      links.push({ source: source.id, target: target.id, value: taken });
      unfilled -= taken;
      remainingInSource -= taken;
    }
  }

  return links;
};
