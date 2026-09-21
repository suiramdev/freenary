import type { TransactionChannel } from "../types";
import type { DescriptorCaptureGroups } from "./capture-groups";

export interface PatternRule {
  readonly channel: TransactionChannel;
  readonly linePattern: RegExp;
  readonly parseLabelDate?: (captured: string) => string | undefined;
  readonly extractPayee?: (
    groups: DescriptorCaptureGroups
  ) => string | undefined;
}

export interface InstitutionDef {
  readonly id: string;
  readonly bicPrefixes: readonly string[];
  readonly nameSubstrings: readonly string[];
  readonly groupSubstrings?: readonly string[];
  readonly patternsInMatchOrder: readonly PatternRule[];
  readonly noiseLinePatterns?: readonly RegExp[];
  readonly cleanPayee?: (text: string) => string;
}
