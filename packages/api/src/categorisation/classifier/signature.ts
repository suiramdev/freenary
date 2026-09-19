import { createHash } from "node:crypto";

import { TAXONOMY_VERSION } from "../../lib/taxonomy";
import type { ClassificationInput, TransactionClassifier } from "./types";

export const classificationSignature = (
  classifier: Pick<TransactionClassifier, "provider" | "model">,
  input: ClassificationInput
): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        classifier.provider,
        classifier.model,
        TAXONOMY_VERSION,
        input.merchantKey ?? input.normalisedDescriptor,
        input.country,
        input.direction,
        input.merchantCategoryCode,
      ])
    )
    .digest("hex");
