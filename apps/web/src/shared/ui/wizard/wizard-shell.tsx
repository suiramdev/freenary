import { BrandAvatar } from "@freenary/ui/components/brand-avatar";
import { spring } from "@freenary/ui/lib/springs";
import { SURFACE_BG } from "@freenary/ui/lib/surface-classes";
import { SurfaceProvider } from "@freenary/ui/lib/surface-context";
import { cn } from "@freenary/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { m } from "@/paraglide/messages.js";

import { LocaleSwitcher } from "../locale-switcher";
import { ThemeSwitcher } from "../theme-switcher";
import { PINK_GRADIENT } from "./pink-gradient";
import { WizardShowcase } from "./wizard-showcase";

const STEP_SHIFT_PX = 16;
const NO_STEP_SHIFT_PX = 0;
const STEP_CROSSFADE_MASK_BLUR = "blur(4px)";
const NO_BLUR = "blur(0px)";
const BRAND_MARK_PX = 28;

interface StepMotion {
  direction: 1 | -1;
  shift: number;
}

const stepVariants = {
  center: { filter: NO_BLUR, opacity: 1, transition: spring.slow, x: 0 },
  enter: ({ direction, shift }: StepMotion) => ({
    filter: shift ? STEP_CROSSFADE_MASK_BLUR : NO_BLUR,
    opacity: 0,
    x: direction * shift,
  }),
  exit: ({ direction, shift }: StepMotion) => ({
    filter: shift ? STEP_CROSSFADE_MASK_BLUR : NO_BLUR,
    opacity: 0,
    transition: spring.slow.exit,
    x: -direction * shift,
  }),
};

type WizardLayout = "centered" | "split";

interface WizardShellProps {
  children: ReactNode;
  direction: 1 | -1;
  isPending: boolean;
  layout?: WizardLayout;
  skeleton: ReactNode;
  stepKey: string;
  stepper: ReactNode;
  toolbar: ReactNode;
}

export const WizardShell = ({
  children,
  direction,
  isPending,
  layout = "split",
  skeleton,
  stepKey,
  stepper,
  toolbar,
}: WizardShellProps) => {
  const prefersReducedMotion = useReducedMotion();
  const stepMotion: StepMotion = {
    direction,
    shift: prefersReducedMotion ? NO_STEP_SHIFT_PX : STEP_SHIFT_PX,
  };

  const isCentered = layout === "centered";

  const column = (
    <div
      className={cn(
        "flex min-w-0 flex-col px-5",
        isCentered ? "min-h-svh sm:min-h-0 sm:px-8" : "sm:px-10"
      )}
    >
      <header className="mx-auto flex min-h-16 w-full max-w-md flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-6">
        <span className="flex items-center gap-2">
          <BrandAvatar frozen size={BRAND_MARK_PX} state="logo" />
          <span className="font-heading text-sm font-semibold tracking-tight">
            {m.shell_brand_name()}
          </span>
        </span>
        {isPending ? null : stepper}
      </header>

      <div className="flex flex-1 items-center">
        <div className="relative mx-auto flex w-full max-w-md flex-col py-12">
          <AnimatePresence initial={false} mode="popLayout">
            {isPending ? (
              <motion.div
                key="skeleton"
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: spring.moderate.exit }}
                initial={{ opacity: 0 }}
                transition={spring.moderate}
              >
                {skeleton}
              </motion.div>
            ) : (
              <motion.div
                key="wizard"
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: spring.moderate.exit }}
                initial={{ opacity: 0 }}
                transition={spring.moderate}
              >
                <AnimatePresence
                  custom={stepMotion}
                  initial={false}
                  mode="popLayout"
                >
                  <motion.div
                    key={stepKey}
                    animate="center"
                    custom={stepMotion}
                    exit="exit"
                    initial="enter"
                    variants={stepVariants}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="mx-auto flex w-full max-w-md flex-wrap items-center gap-1 pb-5">
        <ThemeSwitcher />
        <LocaleSwitcher />
        <span className="ms-auto">{toolbar}</span>
      </footer>
    </div>
  );

  if (isCentered) {
    return (
      <SurfaceProvider value={1}>
        <main
          className="relative grid min-h-svh place-items-center sm:p-6"
          data-wizard-headline
          style={{ backgroundImage: PINK_GRADIENT }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 dark:bg-black/45"
          />
          <div
            className={cn(
              SURFACE_BG[1],
              "relative w-full sm:max-w-xl sm:rounded-2xl sm:shadow-2xl"
            )}
          >
            {column}
          </div>
        </main>
      </SurfaceProvider>
    );
  }

  return (
    <SurfaceProvider value={1}>
      <main
        className={cn(
          SURFACE_BG[1],
          "grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        )}
        data-wizard-headline
      >
        {column}
        <WizardShowcase />
      </main>
    </SurfaceProvider>
  );
};
