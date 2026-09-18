import { Data, Result } from "effect";

import { GENERIC_PARSER_ID } from "./institutions/parse-engine";
import { genericParser, institutionParsers } from "./institutions/registry";
import type { DescriptorParseInput, DescriptorParseResult } from "./types";

class DescriptorParserCrashed extends Data.TaggedError(
  "DescriptorParserCrashed"
)<{
  readonly institutionName: string;
  readonly thrown: unknown;
}> {}

const unidentifiedDescriptor = (): DescriptorParseResult => ({
  channel: "unknown",
  droppedLines: [],
  normalisedDescriptor: "",
  parserId: GENERIC_PARSER_ID,
  payeeText: null,
});

export const parseDescriptor = (
  input: DescriptorParseInput
): DescriptorParseResult =>
  Result.getOrElse(
    Result.try({
      catch: (thrown) =>
        new DescriptorParserCrashed({
          institutionName: input.institutionName,
          thrown,
        }),
      try: () =>
        (
          institutionParsers.find((parser) => parser.matches(input)) ??
          genericParser
        ).parse(input),
    }),
    unidentifiedDescriptor
  );
