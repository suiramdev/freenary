import type { AppRouter } from "@freenary/api/routers/index";
import { env } from "@freenary/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";
import { m } from "@/paraglide/messages.js";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // `error.message` stays as the server sent it; only the framing is ours
        // to translate.
        toast.error(m.query_error({ reason: error.message }), {
          action: {
            label: m.query_error_retry(),
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });

/**
 * Per-call context. The browser never sets it — its cookies travel with
 * `credentials`. A server-side call has no cookie jar, so a request made on a
 * visitor's behalf while rendering carries the visitor's own cookie header.
 */
interface ClientContext {
  cookie?: string;
}

const link = new RPCLink<ClientContext>({
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
  headers: ({ context }) =>
    context.cookie === undefined ? {} : { cookie: context.cookie },
  url: `${getServerUrl(env.VITE_SERVER_URL)}/rpc`,
});

// SAFETY: createORPCClient returns a generic client; cast aligns it with the known AppRouter type
const getORPCClient = () =>
  createORPCClient(link) as RouterClient<AppRouter, ClientContext>;

export const client: RouterClient<AppRouter, ClientContext> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
