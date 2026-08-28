import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import type * as React from "react";

interface SettingsSectionProps {
  /** Action button rendered to the right of the section header. */
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  title: string;
}

export const SettingsSection = ({
  action,
  children,
  description,
  title,
}: SettingsSectionProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-xs font-medium">{title}</CardTitle>
      <CardDescription className="text-xs">{description}</CardDescription>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
    <CardContent className="flex flex-col gap-6">{children}</CardContent>
  </Card>
);
