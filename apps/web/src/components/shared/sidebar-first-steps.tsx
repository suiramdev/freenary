import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@freenary/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { SidebarFirstStepIcon } from "@/components/shared/sidebar-first-step-icon";
import { useFirstSteps } from "@/hooks/first-steps/use-first-steps";
import { FIRST_STEPS } from "@/lib/first-steps";
import { m } from "@/paraglide/messages.js";

const HEADING_ID = "first-steps-heading";

/**
 * How long the finished checklist stays up. Without it the panel unmounts in
 * the same render that would have ticked the final step, so both the exit and
 * the screen reader report the stale count.
 */
const COMPLETION_HOLD_MS = 1400;

/**
 * The panel only orchestrates. Its heading and rows carry the movement, so the
 * entrance reads as a checklist assembling rather than one block sliding in.
 */
// The panel's own exit keeps a blur: it unmounts, so nothing rests layered.
const PANEL_VARIANTS = {
  // Softer and shorter than the enter, and unstaggered: the finished step is
  // the news, not the checklist leaving.
  exit: {
    filter: "blur(4px)",
    opacity: 0,
    transition: { duration: 0.15, ease: "easeOut" },
    y: -12,
  },
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

/**
 * Opacity and translateY only, no blur. Motion resolves a `none` filter target
 * back to `blur(0px)` and re-applies it on every render, so an animated filter
 * on an element that stays mounted leaves a compositing layer the sidebar's
 * width transition then fails to repaint.
 */
// No `exit` key, so the rows hold position while the panel fades out as one.
const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
    y: 0,
  },
} as const;

const PANEL_MOTION_REDUCED = {
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
  initial: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;

const PANEL_MOTION_STAGGERED = {
  animate: "visible",
  exit: "exit",
  initial: "hidden",
  variants: PANEL_VARIANTS,
} as const;

const MotionSidebarMenuItem = motion.create(SidebarMenuItem);

/**
 * Names every transitioned property so merging keeps the sidebar's own collapse
 * transition, and so completing a step dims the row instead of snapping it.
 */
const ROW_MOTION_CLASS =
  "transition-[width,height,padding,scale,color] duration-150 ease-out active:scale-[0.96]";

export const SidebarFirstSteps = () => {
  const state = useFirstSteps();
  const prefersReducedMotion = useReducedMotion();
  const hash = useLocation({ select: (location) => location.hash });
  const doneCount =
    state === null
      ? 0
      : FIRST_STEPS.filter((step) => step.isDone(state)).length;
  const isComplete = state !== null && doneCount === FIRST_STEPS.length;
  const itemVariants = prefersReducedMotion ? undefined : ITEM_VARIANTS;

  /**
   * Derived during render rather than in an effect, so the panel only ever
   * opens for a checklist first seen with work left: one already finished on
   * arrival stays hidden instead of flashing.
   */
  const [phase, setPhase] = useState<"closing" | "hidden" | "open">("hidden");

  if (state !== null) {
    if (isComplete) {
      if (phase === "open") {
        setPhase("closing");
      }
    } else if (phase !== "open") {
      setPhase("open");
    }
  }

  useEffect(() => {
    if (phase !== "closing") {
      return;
    }
    const timer = setTimeout(() => setPhase("hidden"), COMPLETION_HOLD_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <AnimatePresence>
      {state !== null && phase !== "hidden" && (
        <motion.div
          {...(prefersReducedMotion
            ? PANEL_MOTION_REDUCED
            : PANEL_MOTION_STAGGERED)}
          className="bg-sidebar-accent/50 ring-sidebar-border rounded-[calc(var(--radius-sm)+6px)] p-1 ring-1 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:ring-0"
        >
          {/* The label owns the rail's opacity-0 collapse rule, so it must not
              be the animated element: motion writes opacity inline, which no
              class can outrank. */}
          <motion.div variants={itemVariants}>
            <SidebarGroupLabel className="justify-between" id={HEADING_ID}>
              <span>{m.first_steps_title()}</span>
              <span className="text-sidebar-foreground/50 tabular-nums">
                {m.first_steps_progress({
                  done: doneCount,
                  total: FIRST_STEPS.length,
                })}
              </span>
            </SidebarGroupLabel>
          </motion.div>
          <SidebarMenu aria-labelledby={HEADING_ID}>
            {FIRST_STEPS.map((step) => {
              const label = step.label();
              const isStepDone = step.isDone(state);

              return (
                <MotionSidebarMenuItem key={step.id} variants={itemVariants}>
                  <SidebarMenuButton
                    className={
                      isStepDone
                        ? `${ROW_MOTION_CLASS} text-sidebar-foreground/50`
                        : ROW_MOTION_CLASS
                    }
                    onClick={() => {
                      // A Link to the location you are already on emits no
                      // navigation, so nothing would move the viewport.
                      if (hash === step.hash) {
                        document
                          .querySelector(`#${step.hash}`)
                          ?.scrollIntoView({ block: "start" });
                      }
                    }}
                    render={<Link hash={step.hash} to={step.to} />}
                    tooltip={label}
                  >
                    <SidebarFirstStepIcon done={isStepDone} icon={step.icon} />
                    {/* Before the label: the button truncates its last child. */}
                    <span className="sr-only">
                      {isStepDone
                        ? m.first_steps_state_done()
                        : m.first_steps_state_todo()}
                    </span>
                    <span>{label}</span>
                  </SidebarMenuButton>
                </MotionSidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
