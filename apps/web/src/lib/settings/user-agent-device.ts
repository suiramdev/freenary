/** The device families a session row can name; anything else reads as unknown. */
export type DeviceSlug =
  | "android"
  | "chromebook"
  | "ipad"
  | "iphone"
  | "linux"
  | "mac"
  | "unknown"
  | "windows";

/**
 * Order is the whole trick: an Android user agent also claims "Linux", ChromeOS
 * claims both, and an iPad claims "Macintosh" in desktop mode — so the narrower
 * family has to be tested first.
 */
const DEVICE_PATTERNS: [RegExp, DeviceSlug][] = [
  [/\biphone\b/iu, "iphone"],
  [/\bipad\b/iu, "ipad"],
  [/\bcros\b/iu, "chromebook"],
  [/\bandroid\b/iu, "android"],
  [/\bwindows\b|\bwin(?:32|64)\b/iu, "windows"],
  [/\bmacintosh\b|\bmac os x\b/iu, "mac"],
  [/\blinux\b|\bx11\b/iu, "linux"],
];

export const deviceSlugFromUserAgent = (
  userAgent?: string | null
): DeviceSlug => {
  if (!userAgent) {
    return "unknown";
  }

  for (const [pattern, slug] of DEVICE_PATTERNS) {
    if (pattern.test(userAgent)) {
      return slug;
    }
  }

  return "unknown";
};
