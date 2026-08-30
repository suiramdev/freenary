import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { NotFound } from "@/components/shared/not-found";
import { createQueryClient, orpc } from "@/utils/orpc";

import { routeTree } from "./routeTree.gen";

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
