import { Button } from "@freenary/ui/components/button";
import { Card, CardContent } from "@freenary/ui/components/card";
import { Spinner } from "@freenary/ui/components/spinner";
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
        className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit"
        exit={{
          filter: "blur(4px)",
          opacity: 0,
          transition: { duration: 0.15, ease: "easeOut" },
          y: 12,
        }}
        initial={{ filter: "blur(4px)", opacity: 0, y: 12 }}
        transition={spring}
      >
        {/* Elevated: the bar floats over the page it is editing. */}
        <Card className="shadow-md" size="sm">
          <CardContent className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs font-medium">
              {changeCount} unsaved change{changeCount === 1 ? "" : "s"}
            </span>
            <Button disabled={isSaving} onClick={onCancel} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSaving || hasErrors} onClick={onSave}>
              {isSaving && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )}
  </AnimatePresence>
);
