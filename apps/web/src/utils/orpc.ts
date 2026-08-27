import type { AppRouter } from "@freenary/api/routers/index";
import { env } from "@freenary/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(`Error: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });

const link = new RPCLink({
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
  url: `${getServerUrl(env.VITE_SERVER_URL)}/rpc`,
});

// SAFETY: createORPCClient returns a generic client; cast aligns it with the known AppRouter type
const getORPCClient = () => createORPCClient(link) as RouterClient<AppRouter>;

export const client: RouterClient<AppRouter> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
