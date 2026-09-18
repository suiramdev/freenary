import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/budget/")({
  beforeLoad: ({ search }) => {
    throw redirect({
      replace: true,
      search,
      to: "/budget/transactions",
    });
  },
});
