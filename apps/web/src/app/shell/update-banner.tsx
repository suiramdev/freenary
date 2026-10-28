import { Button } from "@freenary/ui/components/button";
import { RiCloseLine, RiExternalLinkLine } from "@remixicon/react";
import { useId } from "react";

import { m } from "@/paraglide/messages.js";
import { releaseNotesUrl, updateGuideUrl } from "@/shared/config";

import {
  dismissUpdate,
  isBannerShown,
  useDismissedUpdate,
} from "./update-dismissal";

const NewTabLink = ({ href, label }: { href: string; label: string }) => (
  <a
    className="inline-flex min-h-6 items-center gap-1 rounded-sm font-medium underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
    href={href}
    rel="noopener noreferrer"
    target="_blank"
  >
    {label}
    <RiExternalLinkLine aria-hidden="true" className="size-3.5 shrink-0" />
    <span className="sr-only">{m.update_banner_new_tab()}</span>
  </a>
);

export const UpdateBanner = ({ latest }: { latest: string | null }) => {
  const headingId = useId();
  const dismissed = useDismissedUpdate();

  if (!isBannerShown(latest, dismissed)) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className="bg-muted text-foreground border-border flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b py-2 ps-4 pe-2 text-sm"
    >
      <p className="font-medium" id={headingId}>
        {m.update_banner_title({ version: latest })}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NewTabLink
          href={releaseNotesUrl(latest)}
          label={m.account_menu_update_release_notes()}
        />
        <NewTabLink
          href={updateGuideUrl(latest)}
          label={m.account_menu_update_guide()}
        />
      </div>
      <Button
        aria-label={m.update_banner_dismiss({ version: latest })}
        className="ms-auto"
        onClick={() => {
          dismissUpdate(latest);
        }}
        size="icon-compact"
        type="button"
        variant="tertiary"
      >
        <RiCloseLine aria-hidden="true" />
      </Button>
    </section>
  );
};
