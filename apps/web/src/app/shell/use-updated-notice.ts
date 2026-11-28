import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { orpc } from "@/shared/api";
import { authClient } from "@/shared/auth";

const RELEASE_STALE_TIME_MS = 60 * 60 * 1000;
const LAST_SEEN_VERSION_KEY = "freenary:last-seen-version";
const RELEASE_NOTES_BASE_URL =
  "https://github.com/suiramdev/freenary/releases/tag";

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

// Version comparison mirrors parseVersion/isNewer in
// packages/api/src/instance/release.ts, which lives on the server and
// cannot be imported here.
const parseVersion = (value: string): ParsedVersion | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/.exec(value);
  if (match === null) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
};

const isNewerVersion = (candidate: string, running: string): boolean => {
  const next = parseVersion(candidate);
  const current = parseVersion(running);
  if (next === null || current === null) {
    return false;
  }
  if (next.major !== current.major) {
    return next.major > current.major;
  }
  if (next.minor !== current.minor) {
    return next.minor > current.minor;
  }
  if (next.patch !== current.patch) {
    return next.patch > current.patch;
  }
  if (next.prerelease === current.prerelease) {
    return false;
  }
  if (next.prerelease === undefined) {
    return true;
  }
  if (current.prerelease === undefined) {
    return false;
  }
  return next.prerelease > current.prerelease;
};

const readStoredVersion = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
  } catch {
    return null;
  }
};

const writeStoredVersion = (version: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
  } catch {
    // Blocked storage: no notice and no error, per issue #347.
  }
};

export type UpdatedNotice = {
  version: string;
  releaseNotesUrl: string;
  dismiss: () => void;
  openReleaseNotes: () => void;
};

// Notice shown once per version after the instance moves to a newer
// stable version. Returns null on first visit (the running version
// is recorded instead), when `current` is null (images tagged
// main/dev/sha-...), for the same or an older version, and after
// dismissal for that version. The shell renders it only when no
// "available update" banner is shown.
export const useUpdatedNotice = (): UpdatedNotice | null => {
  const { data: session } = authClient.useSession();
  const release = useQuery(
    orpc.instance.update.queryOptions({
      enabled: session !== null,
      staleTime: RELEASE_STALE_TIME_MS,
    }),
  );
  const current = release.data?.current ?? null;
  const [lastSeen, setLastSeen] = useState<string | null>(() =>
    readStoredVersion(),
  );

  useEffect(() => {
    if (current === null || lastSeen !== null) {
      return;
    }
    writeStoredVersion(current);
    setLastSeen(current);
  }, [current, lastSeen]);

  const dismiss = useCallback(() => {
    if (current === null) {
      return;
    }
    writeStoredVersion(current);
    setLastSeen(current);
  }, [current]);

  if (current === null || lastSeen === null) {
    return null;
  }
  if (!isNewerVersion(current, lastSeen)) {
    return null;
  }
  return {
    version: current,
    releaseNotesUrl: `${RELEASE_NOTES_BASE_URL}/v${current}`,
    dismiss,
    openReleaseNotes: dismiss,
  };
};
