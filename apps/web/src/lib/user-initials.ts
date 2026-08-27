/** Up to two uppercase initials for an avatar fallback. */
export const userInitials = (name: string | undefined): string =>
  name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";
