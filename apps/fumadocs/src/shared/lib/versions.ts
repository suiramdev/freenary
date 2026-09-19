import { docsRoute } from "../config/site";

const MAJOR_MINOR = /^\d+\.\d+$/;

const MAJOR_MINOR_OF_SEMVER = /^(\d+\.\d+)\.\d+$/;

const SORTS_BEFORE = -1;

const SORTS_AFTER = 1;

export const NEXT_VERSION = "next";

export const isVersionId = (segment: string): boolean =>
  segment === NEXT_VERSION || MAJOR_MINOR.test(segment);

export const releaseFolder = (version: string): string | undefined =>
  MAJOR_MINOR_OF_SEMVER.exec(version)?.[1];

export const compareVersionIds = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  if (left === NEXT_VERSION) {
    return SORTS_AFTER;
  }

  if (right === NEXT_VERSION) {
    return SORTS_BEFORE;
  }

  const [leftMajor, leftMinor] = left.split(".").map(Number);
  const [rightMajor, rightMinor] = right.split(".").map(Number);

  return rightMajor - leftMajor || rightMinor - leftMinor;
};

export const versionOfPath = (pathname: string): string | undefined => {
  if (!pathname.startsWith(`${docsRoute}/`)) {
    return undefined;
  }

  const [first] = pathname.slice(docsRoute.length + 1).split("/");

  return isVersionId(first) ? first : undefined;
};

export const isVersionedPath = (pathname: string): boolean =>
  versionOfPath(pathname) !== undefined;

export const resolveDocsHref = (
  href: string | undefined,
  pathname: string
): string | undefined => {
  if (!href?.startsWith(`${docsRoute}/`) || isVersionedPath(href)) {
    return href;
  }

  const readerVersion = versionOfPath(pathname);

  return readerVersion === undefined
    ? href
    : `${docsRoute}/${readerVersion}${href.slice(docsRoute.length)}`;
};
