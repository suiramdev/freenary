import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { Elevated } from "@freenary/ui/lib/elevated";
import { cn } from "@freenary/ui/lib/utils";
import type * as React from "react";

interface SettingsSectionProps {
  action?: React.ReactNode;
  children?: React.ReactNode;
  description: string;
  title: string;
}

const SETTINGS_INSET = "gap-3";

export const SETTINGS_BLEED = "-mx-3";

const SETTINGS_PROSE = "text-[13px] leading-normal";

const CARD_CLIP_RADIUS = "rounded-xl";

const SETTINGS_SURFACE_STEP = 1;

export const SettingsSection = ({
  action,
  children,
  description,
  title,
}: SettingsSectionProps) => (
  <Elevated className={CARD_CLIP_RADIUS} offset={SETTINGS_SURFACE_STEP}>
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children ? (
        <CardContent
          className={cn("flex flex-col", SETTINGS_PROSE, SETTINGS_INSET)}
        >
          {children}
        </CardContent>
      ) : null}
    </Card>
  </Elevated>
);
