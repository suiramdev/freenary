import { Toaster } from "@freenary/ui/components/sonner";
import { UiLabelsProvider } from "@freenary/ui/lib/labels";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { ThemeProvider } from "next-themes";

import { UNKNOWN_VIEWER, getViewer } from "@/functions/get-viewer";
import { isServer } from "@/lib/is-server";
import { publicServerUrlScript } from "@/lib/server-url";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import type { orpc } from "@/utils/orpc";

import appCss from "../index.css?url";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

const RootDocument = () => (
  <html lang={getLocale()} suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <UiLabelsProvider
          labels={{
            close: m.ui_close(),
            loading: m.ui_loading(),
            more: m.ui_more(),
            scrollToEnd: m.ui_scroll_to_end(),
            scrollToStart: m.ui_scroll_to_start(),
            sidebar: m.ui_sidebar(),
            sidebarDescription: m.ui_sidebar_description(),
            toggleSidebar: m.ui_toggle_sidebar(),
          }}
        >
          <Outlet />
        </UiLabelsProvider>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRouteWithContext<RouterAppContext>()({
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },

  beforeLoad: async () => ({
    viewer: isServer ? await getViewer() : UNKNOWN_VIEWER,
  }),

  head: () => {
    const serverUrlScript = publicServerUrlScript();

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "Freenary",
        },
      ],
      links: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon.png",
        },
        {
          rel: "stylesheet",
          href: appCss,
        },
      ],
      scripts: serverUrlScript ? [{ children: serverUrlScript }] : [],
    };
  },

  component: RootDocument,
});
