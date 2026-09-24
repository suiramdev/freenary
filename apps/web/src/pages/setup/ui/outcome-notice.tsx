import { cn } from "@freenary/ui/lib/utils";
import { RiCheckLine, RiErrorWarningLine } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { remixIcon } from "@/shared/lib/remix-icon";

import type { SaveOutcome } from "../model/outcome";
import { isFailedOutcome, outcomeMessage } from "../model/outcome";

const NOTICE_ICON_SIZE = 16;
const ICON_SWAP = { bounce: 0, duration: 0.3, type: "spring" } as const;
const ICON_HIDDEN = { filter: "blur(4px)", opacity: 0, scale: 0.25 };
const ICON_SHOWN = { filter: "blur(0px)", opacity: 1, scale: 1 };
const AlertIcon = remixIcon(RiErrorWarningLine);
const CheckIcon = remixIcon(RiCheckLine);

interface OutcomeNoticeProps {
  outcome: SaveOutcome | undefined;
}

export const OutcomeNotice = ({ outcome }: OutcomeNoticeProps) => {
  if (outcome === undefined) {
    return null;
  }

  const isFailure = isFailedOutcome(outcome);

  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm",
        isFailure ? "text-destructive" : "text-muted-foreground"
      )}
      role={isFailure ? "alert" : "status"}
    >
      <span className="relative mt-0.5 flex size-4 shrink-0">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={ICON_SHOWN}
            aria-hidden="true"
            className="absolute inset-0 flex"
            exit={ICON_HIDDEN}
            initial={ICON_HIDDEN}
            key={isFailure ? "failure" : "success"}
            transition={ICON_SWAP}
          >
            {isFailure ? (
              <AlertIcon size={NOTICE_ICON_SIZE} />
            ) : (
              <CheckIcon size={NOTICE_ICON_SIZE} />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="min-w-0 break-words">{outcomeMessage(outcome)}</span>
    </p>
  );
};
