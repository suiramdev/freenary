import { Button } from "@freenary/ui/components/button";
import { useIcon } from "@freenary/ui/lib/icon-context";
import { spring } from "@freenary/ui/lib/springs";
import { surfaceClasses } from "@freenary/ui/lib/surface-classes";
import { SurfaceProvider } from "@freenary/ui/lib/surface-context";
import { cn } from "@freenary/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

import { m } from "@/paraglide/messages.js";

const PAGE_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
} as const;

const BLOCK_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, transition: spring.moderate, y: 0 },
} as const;

export const NotFound = () => {
  const ArrowLeftIcon = useIcon("arrow-left");

  return (
    <SurfaceProvider value={1}>
      <main
        className={cn(
          "flex min-h-svh flex-col items-center justify-center px-6 text-center",
          surfaceClasses(1)
        )}
      >
        <motion.div
          animate="visible"
          className="flex max-w-md flex-col items-center gap-5"
          initial="hidden"
          variants={PAGE_VARIANTS}
        >
          <motion.p
            aria-hidden="true"
            className="text-primary text-[7rem] leading-none font-bold sm:text-[9rem]"
            variants={BLOCK_VARIANTS}
          >
            404
          </motion.p>
          <motion.h1
            className="text-foreground text-2xl font-bold"
            variants={BLOCK_VARIANTS}
          >
            {m.shell_not_found_title()}
          </motion.h1>
          <motion.p className="text-muted-foreground" variants={BLOCK_VARIANTS}>
            {m.shell_not_found_description()}
          </motion.p>
          <motion.div className="mt-2" variants={BLOCK_VARIANTS}>
            <Button asChild leadingIcon={ArrowLeftIcon}>
              <Link to="/">{m.shell_not_found_back_home()}</Link>
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </SurfaceProvider>
  );
};
