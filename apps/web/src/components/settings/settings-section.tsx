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
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
    <CardContent className="flex flex-col gap-6">{children}</CardContent>
  </Card>
);
