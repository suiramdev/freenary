const MAX_INITIALS = 2;
const NO_INITIALS = "?";

export const userInitials = (name: string | undefined): string =>
  name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, MAX_INITIALS) ?? NO_INITIALS;
