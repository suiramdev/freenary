import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/shared/api";

export const useSyncProgress = () => {
  const { data } = useQuery(orpc.budget.getSyncStatus.queryOptions());

  return data ?? null;
};
