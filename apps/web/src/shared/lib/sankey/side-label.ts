const SEPARATOR = ": ";
const MIN_RECOGNISABLE_LABEL_CHARS = 5;
const ELLIPSIS = "…";

export const fitSideLabel = (
  label: string,
  value: string,
  maxChars: number
): string | null => {
  if (maxChars < MIN_RECOGNISABLE_LABEL_CHARS) {
    return null;
  }

  const both = `${label}${SEPARATOR}${value}`;

  if (both.length <= maxChars) {
    return both;
  }

  const roomForLabelBesideWholeValue =
    maxChars - value.length - SEPARATOR.length;

  if (roomForLabelBesideWholeValue >= MIN_RECOGNISABLE_LABEL_CHARS) {
    const trimmed = label.slice(0, roomForLabelBesideWholeValue - 1);

    return `${trimmed}${ELLIPSIS}${SEPARATOR}${value}`;
  }

  return label.length <= maxChars
    ? label
    : `${label.slice(0, maxChars - 1)}${ELLIPSIS}`;
};
