import type { AppRouter } from "@freenary/api/routers/index";
import type { InferRouterOutputs } from "@orpc/server";
import type { UseQueryResult } from "@tanstack/react-query";

export type PortfolioOverview =
  InferRouterOutputs<AppRouter>["portfolio"]["getOverview"];

export type AssetClass =
  PortfolioOverview["netWorth"]["assetClasses"][number]["assetClass"];

export interface WidgetQuery<T> {
  data: T | undefined;
  isError: boolean;
  isPending: boolean;
  isRetrying: boolean;
  handleRetry: () => void;
}

export const widgetQuery = <T>(
  queryState: UseQueryResult<T>
): WidgetQuery<T> => ({
  data: queryState.data,
  handleRetry: () => {
    void queryState.refetch();
  },
  isError: queryState.isError && queryState.data === undefined,
  isPending: queryState.isPending,
  isRetrying: queryState.isFetching,
});
