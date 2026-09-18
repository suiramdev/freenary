import type * as React from "react";
import { useId } from "react";

interface SettingsGroupProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

export const SettingsGroup = ({
  children,
  description,
  title,
}: SettingsGroupProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 border-b pb-2">
        <h2 className="font-heading text-[15px] font-semibold" id={headingId}>
          {title}
        </h2>
        <p className="text-muted-foreground text-xs/relaxed">{description}</p>
      </div>

      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};
