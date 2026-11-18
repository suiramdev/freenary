import { useQuery } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";

import { dashboardsQueryOptions } from "@/entities/dashboard";

import { DASHBOARD_ROUTE_ID, navTrailOf } from "./nav-items";

export const useNavTrail = () => {
  const match = useMatches({ select: (matches) => matches.at(-1) });
  const routeId = match?.routeId;
  const params: Partial<Record<string, string>> = match?.params ?? {};

  const dashboardTitle = useQuery({
    ...dashboardsQueryOptions(),
    enabled: routeId === DASHBOARD_ROUTE_ID,
    select: ({ dashboards }) =>
      dashboards.find((dashboard) => dashboard.id === params.dashboardId)
        ?.title,
  });

  return {
    routeId,
    trail: navTrailOf(routeId, dashboardTitle.data),
  };
};
