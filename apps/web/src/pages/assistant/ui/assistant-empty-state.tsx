import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";

import { m } from "@/paraglide/messages.js";

import { AssistantAvatar } from "./assistant-avatar";

interface AssistantEmptyStateProps {
  avatarState: BrandAvatarState;
  userName: string;
}

export const AssistantEmptyState = ({
  avatarState,
  userName,
}: AssistantEmptyStateProps) => (
  <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
    <AssistantAvatar
      className="size-16"
      label={m.assistant_avatar_label()}
      state={avatarState}
    />
    <div className="space-y-1">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {m.shell_dashboard_welcome({ name: userName })}
      </h2>
      <p className="text-muted-foreground text-sm">
        {m.assistant_empty_description()}
      </p>
    </div>
  </div>
);
