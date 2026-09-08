import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Budget is an area, not a page: the sidebar discloses its pages and the icon
 * rail links here, so the bare path lands on the one a reader wants first.
 * The search travels with the redirect, so a shared link keeps its filters.
 */
export const Route = createFileRoute("/_auth/budget/")({
  beforeLoad: ({ search }) => {
    throw redirect({
      replace: true,
      search,
      to: "/budget/transactions",
    });
  },
});
