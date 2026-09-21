import { createHash } from "node:crypto";

import { TAXONOMY_VERSION } from "../../lib/taxonomy";
import type { ClassificationInput, TransactionClassifier } from "./types";

const digest = (head: readonly string[], input: ClassificationInput): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        ...head,
        TAXONOMY_VERSION,
        input.merchantKey ?? input.normalisedDescriptor,
        input.country,
        input.direction,
        input.merchantCategoryCode,
      ])
    )
    .digest("hex");

export const classificationSignature = (
  classifier: Pick<TransactionClassifier, "provider" | "model">,
  input: ClassificationInput
): string => digest([classifier.provider, classifier.model], input);

export const payloadSignature = (input: ClassificationInput): string =>
  digest(["payload"], input);
