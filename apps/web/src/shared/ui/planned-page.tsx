import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import type { KubaiIconComponent } from "kubai-icons-react";

import type { ChartColorVar } from "../lib/chart-colors";

interface PlannedPageProps {
  color: ChartColorVar;
  description: string;
  icon: KubaiIconComponent;
  title: string;
}

export const PlannedPage = ({
  color,
  description,
  icon: PageIcon,
  title,
}: PlannedPageProps) => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PageIcon color={color} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);
