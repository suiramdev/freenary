export interface DescriptorCaptureGroups {
  readonly payee?: string;
  readonly date?: string;
  readonly card?: string;
  readonly motif?: string;
}

export type DescriptorCaptureName = keyof DescriptorCaptureGroups;

export const nonBlankCapture = (
  groups: DescriptorCaptureGroups,
  name: DescriptorCaptureName
): string | undefined => {
  const trimmed = groups[name]?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
};
