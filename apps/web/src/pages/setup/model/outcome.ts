import { m } from "@/paraglide/messages.js";

export interface SaveOutcome {
  checked?: boolean;
  detail?: string;
  keys?: string[];
  outcome: string;
  reason?: string;
  status?: number | null;
}

const SUCCESS_OUTCOMES: ReadonlySet<string> = new Set([
  "saved",
  "verified",
  "nothing-to-save",
]);

export const isFailedOutcome = (outcome: SaveOutcome | undefined): boolean =>
  outcome !== undefined && !SUCCESS_OUTCOMES.has(outcome.outcome);

export const outcomeMessage = (outcome: SaveOutcome): string => {
  if (outcome.outcome === "saved") {
    return outcome.checked === true
      ? m.setup_saved()
      : m.setup_saved_unchecked();
  }

  if (outcome.outcome === "verified") {
    return m.setup_verified();
  }

  if (outcome.outcome === "nothing-to-save") {
    return m.setup_nothing_to_save();
  }

  if (outcome.outcome === "missing-fields") {
    return m.setup_error_missing_fields({
      keys: (outcome.keys ?? []).join(", "),
    });
  }

  if (outcome.outcome === "environment-owned") {
    return m.setup_error_environment_owned({
      keys: (outcome.keys ?? []).join(", "),
    });
  }

  if (outcome.outcome === "invalid") {
    return m.setup_error_invalid({ detail: outcome.detail ?? "" });
  }

  if (outcome.reason === "rejected") {
    return m.setup_error_probe_rejected({
      detail: outcome.detail ?? "",
      status: outcome.status ?? 0,
    });
  }

  if (outcome.reason === "invalid") {
    return m.setup_error_probe_invalid({ detail: outcome.detail ?? "" });
  }

  return m.setup_error_probe_unreachable({ detail: outcome.detail ?? "" });
};
