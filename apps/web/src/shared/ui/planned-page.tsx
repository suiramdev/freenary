import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import type { RemixiconComponentType } from "@remixicon/react";

interface PlannedPageProps {
  description: string;
  icon: RemixiconComponentType;
  title: string;
}

export const PlannedPage = ({
  description,
  icon: PageIcon,
  title,
}: PlannedPageProps) => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PageIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);
