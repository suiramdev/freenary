import { Skeleton } from "@freenary/ui/components/skeleton";

import { m } from "@/paraglide/messages.js";

/** Stands in for the transcript only; the composer below it is real from the first byte. */
export const AssistantChatSkeleton = () => (
  <div aria-busy="true" className="flex flex-1 flex-col gap-6 py-4">
    <output className="sr-only">{m.assistant_loading_transcript()}</output>
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="ml-auto flex w-2/3 justify-end">
        <Skeleton className="h-12 w-48 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
    </div>
  </div>
);
