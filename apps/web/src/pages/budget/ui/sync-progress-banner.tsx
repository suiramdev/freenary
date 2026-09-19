import { Progress } from "@freenary/ui/components/progress";
import { spring } from "@freenary/ui/lib/springs";
import { RiDownloadCloud2Line, RiPriceTag3Line } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

import type { SyncProgress, SyncProgressDetail } from "../model/sync-progress";
import { syncProgressShape } from "../model/sync-progress";

const HIDDEN = { filter: "blur(4px)", opacity: 0, y: -8 };

const SHOWN = { filter: "blur(0px)", opacity: 1, y: 0 };

const EXIT_TRANSITION = { duration: 0.15, ease: "easeOut" } as const;

const ICON_HIDDEN = { filter: "blur(4px)", opacity: 0, scale: 0.25 };

const ICON_SHOWN = { filter: "blur(0px)", opacity: 1, scale: 1 };

const ICON_TRANSITION = { bounce: 0, duration: 0.3, type: "spring" } as const;

const SURFACE =
  "bg-card flex flex-col gap-2 rounded-xl p-3 shadow-[0_1px_2px_oklch(0_0_0/0.06),0_0_0_1px_oklch(0_0_0/0.05)] dark:shadow-[0_1px_2px_oklch(0_0_0/0.4),0_0_0_1px_oklch(1_0_0/0.07)]";

const detailText = (
  detail: SyncProgressDetail,
  numbers: Intl.NumberFormat
): string => {
  if (detail.kind === "transactions") {
    return m.budget_sync_progress_transactions({
      count: detail.count,
      formatted: numbers.format(detail.count),
    });
  }

  if (detail.kind === "accounts") {
    return m.budget_sync_progress_accounts({
      done: numbers.format(detail.done),
      total: numbers.format(detail.total),
    });
  }

  if (detail.kind === "categorised") {
    return m.budget_sync_progress_categorised({
      done: numbers.format(detail.done),
      total: numbers.format(detail.total),
    });
  }

  return m.budget_sync_progress_starting();
};

const SyncProgressBody = ({ progress }: { progress: SyncProgress }) => {
  const shape = syncProgressShape(progress);
  const numbers = new Intl.NumberFormat(getLocale());
  const detail = detailText(shape.detail, numbers);
  const isImporting = shape.phase === "importing";
  const Icon = isImporting ? RiDownloadCloud2Line : RiPriceTag3Line;
  const title = isImporting
    ? m.budget_sync_progress_importing()
    : m.budget_sync_progress_categorising();

  return (
    <>
      <output className="sr-only">{title}</output>
      <div className="flex items-center gap-2">
        <span className="relative size-4 shrink-0">
          <AnimatePresence initial={false}>
            <motion.span
              animate={ICON_SHOWN}
              className="text-muted-foreground absolute inset-0"
              exit={ICON_HIDDEN}
              initial={ICON_HIDDEN}
              key={shape.phase}
              transition={ICON_TRANSITION}
            >
              <Icon aria-hidden="true" className="size-4" />
            </motion.span>
          </AnimatePresence>
        </span>
        <p className="text-sm font-medium" id="sync-progress-title">
          {title}
        </p>
        <p className="text-muted-foreground ms-auto text-xs tabular-nums">
          {detail}
        </p>
      </div>

      <Progress
        aria-labelledby="sync-progress-title"
        aria-valuetext={detail}
        value={shape.percent}
      />

      <p className="text-muted-foreground text-xs">
        {isImporting
          ? m.budget_sync_progress_hint_importing()
          : m.budget_sync_progress_hint_categorising()}
      </p>
    </>
  );
};

export const SyncProgressBanner = ({
  progress,
}: {
  progress: SyncProgress | null;
}) => (
  <AnimatePresence initial={false}>
    {progress ? (
      <motion.section
        animate={SHOWN}
        aria-labelledby="sync-progress-title"
        className={SURFACE}
        exit={{ ...HIDDEN, transition: EXIT_TRANSITION }}
        initial={HIDDEN}
        key="sync-progress"
        transition={spring.moderate}
      >
        <SyncProgressBody progress={progress} />
      </motion.section>
    ) : null}
  </AnimatePresence>
);
