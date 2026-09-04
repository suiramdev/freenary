import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { RiPlugLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

/** No model endpoint is configured, so there is nothing to type into. */
export const AssistantUnavailable = () => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RiPlugLine />
        </EmptyMedia>
        <EmptyTitle>{m.assistant_unavailable_title()}</EmptyTitle>
        <EmptyDescription>
          {m.assistant_unavailable_description()}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);
