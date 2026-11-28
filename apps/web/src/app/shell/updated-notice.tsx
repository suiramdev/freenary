import { RiCloseLine, RiExternalLinkLine } from "@remixicon/react";

import { Button } from "@freenary/ui/components/button";
import { m } from "@/paraglide/messages.js";
import { useAvailableUpdate } from "./use-available-update";
import { useUpdatedNotice } from "./use-updated-notice";

// Banner shown once per version after the instance was updated,
// in the same top-of-page slot as the available-update banner.
// It never shows together with that banner: when a newer version is
// available, the available banner wins. The shell renders this
// component next to UpdateBanner.
export const UpdatedNotice = () => {
  const notice = useUpdatedNotice();
  const availableUpdate = useAvailableUpdate();

  if (notice === null || availableUpdate !== null) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 text-sm"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate font-medium">
          {m.update_banner_updated_title({ version: notice.version })}
        </span>
        <a
          className="flex shrink-0 items-center gap-1 text-primary underline underline-offset-4"
          href={notice.releaseNotesUrl}
          target="_blank"
          rel="noreferrer"
          onClick={notice.openReleaseNotes}
        >
          {m.update_banner_whats_new()}
          <RiExternalLinkLine className="size-4" aria-hidden />
        </a>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={m.update_banner_dismiss({ version: notice.version })}
        onClick={notice.dismiss}
      >
        <RiCloseLine className="size-4" aria-hidden />
      </Button>
    </div>
  );
};
