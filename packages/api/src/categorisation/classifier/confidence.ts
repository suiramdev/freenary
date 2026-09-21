export const ACCEPT_CONFIDENCE = 0.5;

export const UNDISTRIBUTED_CONFIDENCE = ACCEPT_CONFIDENCE;

export const NEUTRAL_TEMPERATURE = 1;

export const concentration = (
  weights: readonly number[],
  optionCount: number,
  temperature: number
): number => {
  if (optionCount < 2) {
    return 1;
  }

  const sharpened: number[] = [];
  let total = 0;

  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight <= 0) {
      continue;
    }

    const sharp =
      temperature === NEUTRAL_TEMPERATURE
        ? weight
        : weight ** (1 / temperature);

    sharpened.push(sharp);
    total += sharp;
  }

  if (total <= 0) {
    return 0;
  }

  let entropy = 0;

  for (const weight of sharpened) {
    const probability = weight / total;

    entropy -= probability * Math.log(probability);
  }

  return Math.min(1, Math.max(0, 1 - entropy / Math.log(optionCount)));
};

export const softmax = (
  logits: readonly number[],
  temperature: number
): number[] => {
  const highest = Math.max(...logits) / temperature;
  const exponentials: number[] = [];
  let total = 0;

  for (const logit of logits) {
    const exponential = Math.exp(logit / temperature - highest);

    exponentials.push(exponential);
    total += exponential;
  }

  return exponentials.map((value) => value / total);
};
