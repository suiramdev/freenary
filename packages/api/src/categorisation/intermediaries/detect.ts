import { normaliseDescriptor } from "../normalise/normalise-descriptor";
import {
  CREDITOR_IDENTIFIER_INDEX,
  HIGH_CONFIDENCE_MARKER_IDS,
  IBAN_INDEX,
  INTERMEDIARY_CATALOGUE,
  MARKER_INDEX,
} from "./catalogue";
import type {
  DetectIntermediaryInput,
  IntermediaryConfidence,
  IntermediaryMatch,
} from "./types";

/**
 * Visa/MC scheme-permitted acquirer prefix widths: 3, 7, or 12 chars
 * before the asterisk (Chase Paymentech / Worldpay format rules).
 * An asterisk at one of these raw positions corroborates a marker match.
 */
const CORROBORATING_ASTERISK_POSITIONS = [3, 7, 12] as const;
const ASTERISK_CODE = 42;

const hasCorroboratingAsterisk = (raw: string): boolean => {
  for (const pos of CORROBORATING_ASTERISK_POSITIONS) {
    if (raw.codePointAt(pos) === ASTERISK_CODE) {
      return true;
    }
  }
  return false;
};

/**
 * Detect a payment intermediary (PSP / acquirer) in a transaction descriptor
 * and recover the sub-merchant text when present.
 *
 * Returns null rather than a low-confidence guess — a wrong intermediary
 * attribution is worse than none.
 */
export const detectIntermediary = (
  input: DetectIntermediaryInput
): IntermediaryMatch | null => {
  const {
    creditorIban,
    creditorIdentifications,
    normalisedDescriptor,
    rawDescriptor,
  } = input;

  // --- Marker-based detection (leading token only) ---
  if (normalisedDescriptor.length > 0) {
    const spaceIdx = normalisedDescriptor.indexOf(" ");
    const leadingToken =
      spaceIdx === -1
        ? normalisedDescriptor
        : normalisedDescriptor.slice(0, spaceIdx);

    const intermediaryId = MARKER_INDEX[leadingToken];

    if (intermediaryId !== undefined) {
      // SAFETY: intermediaryId comes from MARKER_INDEX which maps to valid catalogue keys
      const def =
        INTERMEDIARY_CATALOGUE[
          intermediaryId as keyof typeof INTERMEDIARY_CATALOGUE
        ];
      if (!def) {
        return null;
      }

      // SAFETY: arbitrary key; miss returns undefined which !== true, giving "medium"
      let confidence: IntermediaryConfidence =
        HIGH_CONFIDENCE_MARKER_IDS[
          intermediaryId as keyof typeof HIGH_CONFIDENCE_MARKER_IDS
        ] === true
          ? "high"
          : "medium";

      // Rule 4: asterisk at a scheme-standard position promotes medium → high
      if (confidence === "medium" && hasCorroboratingAsterisk(rawDescriptor)) {
        confidence = "high";
      }

      let submerchantText: string | null = null;
      let normalisedSubmerchant = "";

      if (def.carriesSubmerchant && spaceIdx !== -1) {
        const remaining = normalisedDescriptor.slice(spaceIdx + 1);
        if (remaining.length > 0) {
          submerchantText = remaining;
          normalisedSubmerchant = normaliseDescriptor(remaining);
        }
      }

      return {
        confidence,
        intermediaryId,
        intermediaryName: def.name,
        matchedBy: "marker",
        normalisedSubmerchant,
        submerchantText,
      };
    }
  }

  // --- IBAN-based detection ---
  if (creditorIban) {
    const intermediaryId = IBAN_INDEX[creditorIban];

    if (intermediaryId !== undefined) {
      // SAFETY: intermediaryId comes from IBAN_INDEX which maps to valid catalogue keys
      const def =
        INTERMEDIARY_CATALOGUE[
          intermediaryId as keyof typeof INTERMEDIARY_CATALOGUE
        ];
      if (!def) {
        return null;
      }
      return {
        confidence: "high",
        intermediaryId,
        intermediaryName: def.name,
        matchedBy: "iban",
        normalisedSubmerchant: "",
        submerchantText: null,
      };
    }
  }

  // --- SEPA creditor-identifier detection ---
  for (const { identification } of creditorIdentifications ?? []) {
    const intermediaryId = CREDITOR_IDENTIFIER_INDEX[identification];

    if (intermediaryId !== undefined) {
      // SAFETY: intermediaryId comes from the index built from catalogue definitions
      const def =
        INTERMEDIARY_CATALOGUE[
          intermediaryId as keyof typeof INTERMEDIARY_CATALOGUE
        ];
      if (!def) {
        return null;
      }
      return {
        confidence: "high",
        intermediaryId,
        intermediaryName: def.name,
        matchedBy: "creditor-identifier",
        normalisedSubmerchant: "",
        submerchantText: null,
      };
    }
  }

  return null;
};
