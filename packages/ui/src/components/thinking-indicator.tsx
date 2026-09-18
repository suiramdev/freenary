"use client";

import { fontWeights } from "@freenary/ui/lib/font-weight";
import { useUiLabels } from "@freenary/ui/lib/labels";
import { useSize, type SizeVariant } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { forwardRef, useState, useEffect, type HTMLAttributes } from "react";

const circleA =
  "M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z";

const infinity =
  "M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z";

const circleB =
  "M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z";

interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the morphing circle⇄infinity glyph before the label. Set to `false`
   *  for a text-only indicator (e.g. inline before a streamed reply). */
  showIcon?: boolean;
  /** Step on the size ladder. Wins over the surrounding SizeProvider. */
  size?: SizeVariant;
  /** The words the label cycles through. Defaults to the shared UI labels, so
   *  a translated app overrides them once rather than at every call site. */
  words?: string[];
}

const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
  ({ className, showIcon = true, size, words: wordsProp, ...props }, ref) => {
    const labels = useUiLabels();
    const words = wordsProp ?? labels.thinkingWords;
    const compactStep = useSize(size).variant === "compact";
    const [index, setIndex] = useState(0);
    // The words are a prop, so a shorter list must not strand the index past
    // its end between the render and the interval's next tick.
    const word = words[index % words.length] ?? "";
    // Reduced motion drops the infinite glyph morph and the word cycling — a
    // static glyph and label carry the same meaning without the movement.
    const reduceMotion = useReducedMotion() ?? false;

    useEffect(() => {
      if (reduceMotion) return;
      const interval = setInterval(() => {
        setIndex((i) => (i + 1) % words.length);
      }, 4000);
      return () => clearInterval(interval);
    }, [reduceMotion, words.length]);

    return (
      <div
        ref={ref}
        role="status"
        className={cn("flex items-center gap-2 px-3 py-2", className)}
        {...props}
      >
        {/* Static announcement — the cycling word display below is aria-hidden
          so screen readers hear one line instead of a re-announcement every
          four seconds. A caller that passes a single word is naming the work,
          so that word is what gets announced. */}
        <span className="sr-only">
          {words.length === 1 ? words[0] : labels.thinking}
        </span>
        {showIcon && (
          <motion.svg
            aria-hidden
            width={compactStep ? 18 : 20}
            height={compactStep ? 18 : 20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground shrink-0"
          >
            {reduceMotion ? (
              <path d={infinity} />
            ) : (
              <motion.path
                d={circleA}
                initial={{ d: circleA }}
                animate={{
                  d: [circleA, infinity, circleB, infinity, circleA],
                }}
                transition={{
                  d: {
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    times: [0, 0.25, 0.5, 0.75, 1.0],
                  },
                }}
              />
            )}
          </motion.svg>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "inline-grid overflow-hidden",
            compactStep ? "text-[12px]" : "text-[13px]"
          )}
          style={{ fontVariationSettings: fontWeights.medium }}
        >
          <span className="shimmer-text invisible col-start-1 row-start-1">
            {words.reduce((a, b) => (a.length >= b.length ? a : b))}
          </span>
          {reduceMotion ? (
            <span className="shimmer-text col-start-1 row-start-1">
              {words[0]}
            </span>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={word}
                className="shimmer-text col-start-1 row-start-1"
                initial={{ y: "80%", opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
                }}
                exit={{
                  y: "-80%",
                  opacity: 0,
                  transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
                }}
              >
                {word}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      </div>
    );
  }
);

ThinkingIndicator.displayName = "ThinkingIndicator";

export { ThinkingIndicator };
export type { ThinkingIndicatorProps };
export default ThinkingIndicator;
