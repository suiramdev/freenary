import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import * as React from "react";

import { newestRelease } from "@/lib/source";
import { versionOfPath } from "@/lib/versions";

import appCss from "@/styles/app.css?url";

const serverLoader = createServerFn({ method: "GET" }).handler(() =>
  newestRelease()
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Freenary documentation",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  loader: () => serverLoader(),
  component: RootComponent,
});

function RootComponent() {
  const newest = Route.useLoaderData();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          search={{
            options: { defaultTag: versionOfPath(pathname) ?? newest },
          }}
        >
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
