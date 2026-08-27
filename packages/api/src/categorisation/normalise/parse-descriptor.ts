import { generic, institutionParsers } from "./institutions/registry";
import type { DescriptorParseInput, DescriptorParseResult } from "./types";

/**
 * Parse a raw bank descriptor into structured merchant/channel data.
 *
 * Selects the first institution parser whose `matches()` returns true,
 * otherwise falls back to the generic parser. Never throws.
 */
export const parseDescriptor = (
  input: DescriptorParseInput
): DescriptorParseResult => {
  try {
    for (const parser of institutionParsers) {
      if (parser.matches(input)) {
        return parser.parse(input);
      }
    }
    return generic.parse(input);
  } catch {
    // Absolute safety net — a parser bug must never propagate
    return {
      channel: "unknown",
      droppedLines: [],
      normalisedDescriptor: "",
      parserId: "generic",
      payeeText: null,
    };
  }
};
