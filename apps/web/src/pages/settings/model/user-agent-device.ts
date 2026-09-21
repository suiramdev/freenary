export type DeviceSlug =
  | "android"
  | "chromebook"
  | "ipad"
  | "iphone"
  | "linux"
  | "mac"
  | "unknown"
  | "windows";

const DEVICE_PATTERNS_NARROWEST_FIRST: [RegExp, DeviceSlug][] = [
  [/\biphone\b/iu, "iphone"],
  [/\bipad\b/iu, "ipad"],
  [/\bcros\b/iu, "chromebook"],
  [/\bandroid\b/iu, "android"],
  [/\bwindows\b|\bwin(?:32|64)\b/iu, "windows"],
  [/\bmacintosh\b|\bmac os x\b/iu, "mac"],
  [/\blinux\b|\bx11\b/iu, "linux"],
];

export const deviceSlugFromUserAgent = (
  userAgent: string | null = null
): DeviceSlug => {
  if (!userAgent) {
    return "unknown";
  }

  for (const [pattern, slug] of DEVICE_PATTERNS_NARROWEST_FIRST) {
    if (pattern.test(userAgent)) {
      return slug;
    }
  }

  return "unknown";
};
