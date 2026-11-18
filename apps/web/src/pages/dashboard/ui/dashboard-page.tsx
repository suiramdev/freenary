import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { MenuItem } from "@freenary/ui/components/menu-item";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { RiDeleteBinLine, RiEdit2Line, RiMoreLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { dashboardQueryOptions } from "@/entities/dashboard";
import { useSyncAccounts } from "@/features/account-sync";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { orpc } from "@/shared/api";
import { startOfDay } from "@/shared/lib/calendar-day";
import { remixIcon } from "@/shared/lib/remix-icon";
import { MissingItem } from "@/shared/ui/missing-item";
import { SyncButton } from "@/shared/ui/sync-button";
import { DashboardGrid } from "@/widgets/dashboard";

import { DeleteDashboardDialog } from "./delete-dashboard-dialog";
import { RenameDashboardDialog } from "./rename-dashboard-dialog";

const route = getRouteApi("/_auth/dashboards/$dashboardId");

const RENAME_ROW = 0;

const DELETE_ROW = 1;

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

const DashboardSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <output className="sr-only">{m.dashboard_loading()}</output>
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

export const DashboardPage = () => {
  const { dashboardId } = route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dashboard = useQuery(dashboardQueryOptions(dashboardId));
  const overview = useQuery(orpc.portfolio.getOverview.queryOptions());
  const { isSyncing, sync } = useSyncAccounts();

  const invalidateDashboards = () =>
    queryClient.invalidateQueries({ queryKey: orpc.dashboards.key() });

  const rename = useMutation(
    orpc.dashboards.update.mutationOptions({ onSuccess: invalidateDashboards })
  );

  const remove = useMutation(
    orpc.dashboards.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateDashboards();
        await navigate({ to: "/" });
      },
    })
  );

  if (dashboard.isError) {
    return (
      <MissingItem
        action={
          <Button render={<Link to="/" />} variant="secondary">
            {m.dashboard_missing_home()}
          </Button>
        }
        description={m.dashboard_missing_description()}
        title={m.dashboard_missing_title()}
      />
    );
  }

  if (dashboard.data === undefined) {
    return (
      <div className="p-4">
        <DashboardSkeleton />
      </div>
    );
  }

  const { title, widgets } = dashboard.data;
  const balancesAt = overview.data?.netWorth.balancesAt;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">
              {title}
            </h1>
            <DropdownMenu>
              <DropdownTrigger
                render={
                  <Button
                    aria-label={m.dashboard_actions()}
                    size="icon-compact"
                    variant="ghost"
                  />
                }
              >
                <RiMoreLine />
              </DropdownTrigger>
              <DropdownContent align="start" className="min-w-48">
                <MenuItem
                  icon={remixIcon(RiEdit2Line)}
                  index={RENAME_ROW}
                  label={m.dashboard_rename()}
                  onSelect={() => setRenaming(true)}
                />
                <MenuItem
                  icon={remixIcon(RiDeleteBinLine)}
                  index={DELETE_ROW}
                  label={m.dashboard_delete()}
                  onSelect={() => setDeleting(true)}
                />
              </DropdownContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          {balancesAt ? (
            <span>
              {m.dashboard_updated({
                time: new Date(balancesAt).toLocaleTimeString(
                  getLocale(),
                  TIME_FORMAT
                ),
              })}
            </span>
          ) : null}
          <SyncButton
            isSyncing={isSyncing}
            label={m.dashboard_refresh()}
            onSync={() => sync({ force: true })}
            size="icon-compact"
          />
        </div>
      </header>
      <DashboardGrid today={today} widgets={widgets} />
      <RenameDashboardDialog
        onOpenChange={setRenaming}
        onRename={(next) => rename.mutate({ dashboardId, title: next })}
        open={renaming}
        title={title}
      />
      <DeleteDashboardDialog
        isDeleting={remove.isPending}
        onConfirm={() => remove.mutate({ dashboardId })}
        onOpenChange={setDeleting}
        open={deleting}
        title={title}
      />
    </div>
  );
};
