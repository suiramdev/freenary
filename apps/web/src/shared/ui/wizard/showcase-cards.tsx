import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { Grid } from "@freenary/ui/components/charts/grid";
import { Line, LineChart } from "@freenary/ui/components/charts/line-chart";
import { StaticChartPreviewProvider } from "@freenary/ui/components/charts/static-chart-preview-context";
import { Elevated } from "@freenary/ui/lib/elevated";
import { cn } from "@freenary/ui/lib/utils";
import { RiArrowUpLine } from "@remixicon/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

import { CHART_COLOR_VARS } from "../../lib/chart-colors";
import { formatCurrency } from "../../lib/format-currency";
import {
  SAMPLE_BALANCE_MINOR,
  SAMPLE_CATEGORIES,
  SAMPLE_CURRENCY,
  SAMPLE_PACE,
  SAMPLE_SPENT_DIFFERENCE_MINOR,
  SAMPLE_SPENT_MINOR,
} from "./showcase-sample";

const PERCENT = 100;
const CHART_MARGIN = { bottom: 8, left: 8, right: 8, top: 8 };
const NO_ANIMATION_MS = 0;

const SHARE_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 0,
  style: "percent",
};

const paceRows = (today: Date) =>
  SAMPLE_PACE.map((point) => ({
    ...point,
    date: new Date(today.getFullYear(), today.getMonth(), point.day),
  }));

const SampleCard = ({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) => (
  <Elevated className={cn("rounded-xl shadow-xl", className)} offset={1}>
    <Card>
      <CardHeader className="min-h-9 items-center">
        <CardTitle className="truncate">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  </Elevated>
);

const Headline = ({ children }: { children: ReactNode }) => (
  <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
    {children}
  </p>
);

const BalanceCard = () => (
  <SampleCard className="w-72" title={m.home_balance_title()}>
    <Headline>{formatCurrency(SAMPLE_BALANCE_MINOR, SAMPLE_CURRENCY)}</Headline>
  </SampleCard>
);

const SpentCard = () => {
  const rows = useMemo(() => paceRows(new Date()), []);

  return (
    <SampleCard className="w-[26rem]" title={m.home_spent_title()}>
      <div className="flex flex-col gap-1">
        <Headline>
          {formatCurrency(SAMPLE_SPENT_MINOR, SAMPLE_CURRENCY)}
        </Headline>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <RiArrowUpLine aria-hidden="true" className="size-4 shrink-0" />
          {m.home_spent_more({
            amount: formatCurrency(
              SAMPLE_SPENT_DIFFERENCE_MINOR,
              SAMPLE_CURRENCY
            ),
          })}
        </p>
      </div>
      <StaticChartPreviewProvider>
        <LineChart
          animationDuration={NO_ANIMATION_MS}
          aspectRatio="auto"
          className="h-28"
          data={rows}
          margin={CHART_MARGIN}
        >
          <Grid horizontal />
          <Line
            animate={false}
            dashFromIndex={0}
            dataKey="previousMinor"
            showHighlight={false}
            stroke={CHART_COLOR_VARS.grey}
            strokeWidth={1.5}
          />
          <Line
            animate={false}
            dataKey="currentMinor"
            showHighlight={false}
            stroke={CHART_COLOR_VARS.blue}
          />
        </LineChart>
      </StaticChartPreviewProvider>
    </SampleCard>
  );
};

const CategoriesCard = () => {
  const locale = getLocale();
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, SHARE_FORMAT),
    [locale]
  );

  return (
    <SampleCard className="w-80" title={m.home_categories_title()}>
      <ul className="flex flex-col gap-3">
        {SAMPLE_CATEGORIES.map((category) => (
          <li className="flex flex-col gap-1.5" key={category.color}>
            <div className="flex items-baseline gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {category.label()}
              </span>
              <span className="tabular-nums">
                {formatCurrency(category.amountMinor, SAMPLE_CURRENCY)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-muted h-1.5 flex-1 rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: category.color,
                    width: `${category.share * PERCENT}%`,
                  }}
                />
              </div>
              <span className="text-muted-foreground w-9 shrink-0 text-end text-xs tabular-nums">
                {percent.format(category.share)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </SampleCard>
  );
};

export const ShowcaseCards = () => (
  <div className="absolute inset-0 flex flex-col justify-center gap-5 ps-[14%]">
    <BalanceCard />
    <div className="ms-16">
      <SpentCard />
    </div>
    <div className="ms-6">
      <CategoriesCard />
    </div>
  </div>
);
