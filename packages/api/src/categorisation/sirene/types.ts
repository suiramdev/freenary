import type { SpendingCategory } from "../../lib/mcc-categories";

export interface SireneResult {
  /** Mapped spending category. */
  category: SpendingCategory;
  /** Legal name from the register. */
  denomination: string;
  /** The NAF/APE code, e.g. '47.11B'. */
  nafCode: string;
  /** SIREN (9-digit legal-unit identifier). */
  siren: string;
  /** Trade name (enseigne) when available. */
  tradeName: string | null;
}
