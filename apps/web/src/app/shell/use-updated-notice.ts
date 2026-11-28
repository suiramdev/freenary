import { useQuery } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { orpc } from "@/shared/api";
import { authClient } from "@/shared/auth";
import { releaseNotesUrl } from "@/shared/config";

const RELEASE_STALE_TIME_MS = 60 * 60 * 1000;
const STORAGE_KEY = "freenary:last-seen-version";

const listeners = new Set<() => void>();
const memory: { lastSeen: string | null } = { lastSeen: null };

const readStorage = Option.liftThrowable(() =>
  localStorage.getItem(STORAGE_KEY),
);

const writeStorage = Option.liftThrowable((version: string) => {
  localStorage.setItem(STORAGE_KEY, version);
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const readLastSeen = (): string | null =>
  Option.getOrElse(readStorage(), () => null) ?? memory.lastSeen;

const UNKNOWN_UNTIL_HYDRATED = undefined;

export const useLastSeenVersion = (): string | null | undefined =>
  useSyncExternalStore(subscribe, readLastSeen, () => UNKNOWN_UNTIL_HYDRATED);

const recordVersion = (version: string) => {
  memory.lastSeen = version;
  writeStorage(version);

  for (const listener of listeners) {
    listener();
  }
};

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

const parseVersion = (value: string): ParsedVersion | null => {
  const match =
    /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<prerelease>[\w.-]+))?$/u.exec(
      value,
    );

  if (match?.groups === undefined) {
    return null;
  }

  return {
    major: Number(match.groups.major),
    minor: Number(match.groups.minor),
    patch: Number(match.groups.patch),
    prerelease: match.groups.prerelease,
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

interface UpdatedNotice {
  dismiss: () => void;
  openReleaseNotes: () => void;
  releaseNotesUrl: string;
  version: string;
}

export const useUpdatedNotice = (): UpdatedNotice | null => {
  const { data: session } = authClient.useSession();
  const release = useQuery(
    orpc.instance.update.queryOptions({
      enabled: session !== null,
      staleTime: RELEASE_STALE_TIME_MS,
    }),
  );
  const current = release.data?.current ?? null;
  const lastSeen = useLastSeenVersion();

  useEffect(() => {
    if (current === null || lastSeen !== null) {
      return;
    }

    recordVersion(current);
  }, [current, lastSeen]);

  const dismiss = useCallback(() => {
    if (current === null) {
      return;
    }

    recordVersion(current);
  }, [current]);

  if (current === null || lastSeen === null || lastSeen === undefined) {
    return null;
  }

  if (!isNewerVersion(current, lastSeen)) {
    return null;
  }

  return {
    dismiss,
    openReleaseNotes: dismiss,
    releaseNotesUrl: releaseNotesUrl(current),
    version: current,
  };
};
