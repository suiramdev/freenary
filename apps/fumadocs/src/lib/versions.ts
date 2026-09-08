import { docsRoute } from "./shared";

/** The folder under `content/docs` that documents unreleased code. */
export const NEXT_VERSION = "next";

const RELEASE_ID = /^\d+\.\d+$/;

/** A released version, `X.Y` — the granularity of the `X.Y` image tag. */
export const isReleaseId = (segment: string): boolean =>
  RELEASE_ID.test(segment);

export const isVersionId = (segment: string): boolean =>
  segment === NEXT_VERSION || isReleaseId(segment);

/** Newest release first, `next` last — the order the dropdown shows. */
export const compareVersionIds = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }
  if (left === NEXT_VERSION) {
    return 1;
  }
  if (right === NEXT_VERSION) {
    return -1;
  }
  const [leftMajor, leftMinor] = left.split(".").map(Number);
  const [rightMajor, rightMinor] = right.split(".").map(Number);
  return rightMajor - leftMajor || rightMinor - leftMinor;
};

/** The version a docs pathname is inside, `undefined` outside `/docs/<version>`. */
export const versionOfPath = (pathname: string): string | undefined => {
  if (!pathname.startsWith(`${docsRoute}/`)) {
    return undefined;
  }
  const [first] = pathname.slice(docsRoute.length + 1).split("/");
  return isVersionId(first) ? first : undefined;
};

/**
 * Authored links carry no version, so a link resolves inside the version the
 * reader is on. A snapshot is then a copy with no link rewriting.
 */
export const resolveDocsHref = (
  href: string | undefined,
  pathname: string
): string | undefined => {
  if (!href?.startsWith(`${docsRoute}/`)) {
    return href;
  }
  const version = versionOfPath(pathname);
  const [first] = href.slice(docsRoute.length + 1).split("/");
  if (!version || isVersionId(first)) {
    return href;
  }
  return `${docsRoute}/${version}${href.slice(docsRoute.length)}`;
};
