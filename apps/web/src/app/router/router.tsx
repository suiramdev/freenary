import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { createQueryClient, orpc } from "@/shared/api";
import { NotFound } from "@/shared/ui/not-found";

import { routeTree } from "../../routeTree.gen";

export const getRouter = () => {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    context: { orpc, queryClient },
    defaultNotFoundComponent: NotFound,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
