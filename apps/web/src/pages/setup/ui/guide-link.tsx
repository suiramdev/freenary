import { RiArrowRightUpLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { remixIcon } from "@/shared/lib/remix-icon";

import { variantGuideUrl, variantLabel } from "../model/labels";

const EXTERNAL_ICON_SIZE = 14;
const ExternalIcon = remixIcon(RiArrowRightUpLine);

interface GuideLinkProps {
  variantId: string;
}

export const GuideLink = ({ variantId }: GuideLinkProps) => {
  const guideUrl = variantGuideUrl(variantId);

  if (guideUrl === null) {
    return null;
  }

  return (
    <a
      className="text-primary inline-flex items-center gap-1 self-start text-sm underline underline-offset-2"
      href={guideUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {m.setup_variant_guide({ provider: variantLabel(variantId) })}
      <ExternalIcon className="shrink-0" size={EXTERNAL_ICON_SIZE} />
    </a>
  );
};
