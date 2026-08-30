import {
  MAX_AMOUNT_MINOR_UNITS,
  MAX_BUDGET_LINE_LABEL_LENGTH,
} from "@freenary/api/lib/budget-profile";
import type { CategoryEntry } from "@freenary/api/lib/categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { BudgetLineKind } from "@/lib/settings/budget-profile-sankey";
import { client, orpc } from "@/utils/orpc";

export interface EditorLine {
  /** Raw text as typed, in major units. */
  amountInput: string;
  categoryKey: string;
  /** Local id used as a React key; never sent to the server. */
  id: string;
  kind: BudgetLineKind;
  label: string;
}

export interface ServerBudgetLine {
  amount: number;
  categoryKey: string;
  id: string;
  kind: BudgetLineKind;
  label: string;
}

const MINOR_UNITS_PER_MAJOR = 100;

const DEFAULT_CATEGORY_KEY = {
  INVESTMENT: "savings",
  OUTGOING: "other",
  REVENUE: "income",
} satisfies Record<BudgetLineKind, string>;

/** Mirrors saveBudgetProfile's line schema so the row error matches the server's rule. */
const lineSchema = z.object({
  amount: z
    .number({ error: "Enter a positive amount" })
    .int("Enter a positive amount")
    .min(0, "Enter a positive amount")
    .max(MAX_AMOUNT_MINOR_UNITS, "Amount is too large"),
  categoryKey: z.string().min(1, "Pick a category"),
  kind: z.enum(["INVESTMENT", "OUTGOING", "REVENUE"]),
  label: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(
      MAX_BUDGET_LINE_LABEL_LENGTH,
      `Name must be at most ${MAX_BUDGET_LINE_LABEL_LENGTH} characters`
    ),
});

/** Minor units for a typed amount; NaN when the text is not a usable number. */
export const amountOf = (amountInput: string): number => {
  const trimmed = amountInput.trim();
  if (trimmed === "") {
    return Number.NaN;
  }
  const major = Number(trimmed.replace(",", "."));
  return Number.isFinite(major)
    ? Math.round(major * MINOR_UNITS_PER_MAJOR)
    : Number.NaN;
};

const toPayload = (line: EditorLine) => ({
  amount: amountOf(line.amountInput),
  categoryKey: line.categoryKey,
  kind: line.kind,
  label: line.label.trim(),
});

const toEditorLines = (serverLines: ServerBudgetLine[]): EditorLine[] =>
  serverLines.map((line) => ({
    amountInput: (line.amount / MINOR_UNITS_PER_MAJOR).toString(),
    categoryKey: line.categoryKey,
    id: line.id,
    kind: line.kind,
    label: line.label,
  }));

const signatureOf = (serverLines: ServerBudgetLine[] | undefined) =>
  JSON.stringify(serverLines ?? []);

/**
 * Draft state for the budgeting profile, saved as one replace-all mutation.
 * The draft only follows the server while it has no unsaved edits, so a
 * background refetch refreshes it (e.g. after a category is deleted and its
 * lines are reassigned) without ever discarding work in progress.
 */
export const useBudgetProfileEditor = (
  serverLines: ServerBudgetLine[] | undefined,
  categories: CategoryEntry[]
) => {
  const queryClient = useQueryClient();
  const [isDirty, setIsDirty] = useState(false);
  // Bumped by every draft edit; the save handler snapshots it so edits made
  // while the request is in flight can be told apart from what was submitted.
  const editCount = useRef(0);
  const [lines, setLines] = useState<EditorLine[]>(() =>
    toEditorLines(serverLines ?? [])
  );
  const [hydratedSignature, setHydratedSignature] = useState(() =>
    signatureOf(serverLines)
  );

  // Hydrated during render, not in an effect: the sections that read `lines`
  // mount on the same commit the profile arrives, and would otherwise lay
  // themselves out against an empty draft.
  const signature = signatureOf(serverLines);
  if (!isDirty && signature !== hydratedSignature) {
    setHydratedSignature(signature);
    setLines(toEditorLines(serverLines ?? []));
  }

  const errors = useMemo(() => {
    const knownKeys = new Set(categories.map((entry) => entry.key));
    const found = new Map<string, string>();
    for (const line of lines) {
      const parsed = lineSchema.safeParse(toPayload(line));
      // A category deleted while this row was being edited leaves a key the
      // server would reject, so surface it here instead of on save.
      const message = knownKeys.has(line.categoryKey)
        ? parsed.error?.issues[0]?.message
        : "Pick a category";
      if (message) {
        found.set(line.id, message);
      }
    }
    return found;
  }, [categories, lines]);

  const changeCount = useMemo(() => {
    const original = toEditorLines(serverLines ?? []);
    const originalById = new Map(original.map((line) => [line.id, line]));
    let count = 0;
    const seen = new Set<string>();
    for (const line of lines) {
      seen.add(line.id);
      const prev = originalById.get(line.id);
      if (!prev) {
        count += 1;
      } else if (
        prev.label !== line.label ||
        prev.amountInput !== line.amountInput ||
        prev.categoryKey !== line.categoryKey ||
        prev.kind !== line.kind
      ) {
        count += 1;
      }
    }
    for (const id of originalById.keys()) {
      if (!seen.has(id)) {
        count += 1;
      }
    }
    return count;
  }, [lines, serverLines]);

  const saveMutation = useMutation({
    mutationFn: (submitted: EditorLine[]) =>
      client.settings.saveBudgetProfile({ lines: submitted.map(toPayload) }),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save budgeting profile");
    },
    onMutate: () => ({ editCount: editCount.current }),
    onSuccess: async (_result, _submitted, saved) => {
      // Clearing the flag while an edit made during the request is still in
      // the draft would let the refetched server snapshot overwrite it below.
      if (editCount.current === saved.editCount) {
        setIsDirty(false);
      }
      // Saving moves lines between categories, so listCategories' usageCount is stale too.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getBudgetProfile.queryOptions().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listCategories.queryOptions().queryKey,
        }),
      ]);
      toast.success("Budgeting profile saved");
    },
  });

  const addLine = useCallback((kind: BudgetLineKind) => {
    editCount.current += 1;
    setIsDirty(true);
    setLines((current) => [
      ...current,
      {
        amountInput: "",
        categoryKey: DEFAULT_CATEGORY_KEY[kind],
        id: crypto.randomUUID(),
        kind,
        label: "",
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    editCount.current += 1;
    setIsDirty(true);
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<EditorLine>) => {
    editCount.current += 1;
    setIsDirty(true);
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  }, []);

  const reset = useCallback(() => {
    editCount.current = 0;
    setIsDirty(false);
    setLines(toEditorLines(serverLines ?? []));
  }, [serverLines]);

  const save = useCallback(() => {
    saveMutation.mutate(lines);
  }, [lines, saveMutation]);

  return {
    addLine,
    changeCount,
    errors,
    isDirty,
    isSaving: saveMutation.isPending,
    lines,
    removeLine,
    reset,
    save,
    updateLine,
  };
};
