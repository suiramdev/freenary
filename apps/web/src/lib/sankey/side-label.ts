const SEPARATOR = ": ";
/** Below this a label stub says nothing, so the label is shown alone instead. */
const MIN_LABEL_STUB = 5;

/**
 * Fits `label` and `value` into `maxChars`, or returns null when even the label
 * cannot be shown.
 *
 * The amount is never sliced. `€2,500.00` cut to `€2…` reads as a different and
 * entirely plausible figure, which is worse in a budget than showing no figure
 * at all — so when both will not fit, the label survives whole and the amount
 * is dropped. The ribbon's thickness already carries magnitude.
 */
export const fitSideLabel = (
  label: string,
  value: string,
  maxChars: number
): string | null => {
  if (maxChars < MIN_LABEL_STUB) {
    return null;
  }

  const full = `${label}${SEPARATOR}${value}`;
  if (full.length <= maxChars) {
    return full;
  }

  // Trim the label rather than the amount, provided enough of it survives to
  // identify the node.
  const roomForLabel = maxChars - value.length - SEPARATOR.length;
  if (roomForLabel >= MIN_LABEL_STUB) {
    return `${label.slice(0, roomForLabel - 1)}…${SEPARATOR}${value}`;
  }

  return label.length <= maxChars ? label : `${label.slice(0, maxChars - 1)}…`;
};
