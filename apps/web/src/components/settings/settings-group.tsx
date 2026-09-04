import type * as React from "react";
import { useId } from "react";

interface SettingsGroupProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

/**
 * One category of settings: a titled band holding the sections that belong
 * together, so sibling cards read as one subject instead of four peers.
 */
export const SettingsGroup = ({
  children,
  description,
  title,
}: SettingsGroupProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 border-b pb-2">
        <h2 className="font-heading text-base font-semibold" id={headingId}>
          {title}
        </h2>
        <p className="text-muted-foreground text-xs/relaxed">{description}</p>
      </div>

      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};
