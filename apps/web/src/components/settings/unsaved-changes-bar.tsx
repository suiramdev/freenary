import { Button } from "@freenary/ui/components/button";
import { AnimatePresence, motion } from "motion/react";

interface UnsavedChangesBarProps {
  changeCount: number;
  hasErrors: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

const spring = { bounce: 0, duration: 0.3, type: "spring" as const };

export const UnsavedChangesBar = ({
  changeCount,
  hasErrors,
  isSaving,
  onCancel,
  onSave,
}: UnsavedChangesBarProps) => (
  <AnimatePresence initial={false}>
    {changeCount > 0 && (
      <motion.div
        animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
        className="bg-card text-card-foreground ring-foreground/10 fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-3 rounded-lg px-4 py-2 shadow-md ring-1"
        exit={{
          filter: "blur(4px)",
          opacity: 0,
          transition: { duration: 0.15, ease: "easeOut" },
          y: 12,
        }}
        initial={{ filter: "blur(4px)", opacity: 0, y: 12 }}
        transition={spring}
      >
        <span className="text-muted-foreground text-xs font-medium">
          {changeCount} unsaved change{changeCount === 1 ? "" : "s"}
        </span>
        <Button disabled={isSaving} onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <Button disabled={isSaving || hasErrors} onClick={onSave}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </motion.div>
    )}
  </AnimatePresence>
);
