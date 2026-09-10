import { Toaster } from "@freenary/ui/components/sonner";
import { IconProvider } from "@freenary/ui/lib/icon-context";
import { UiLabelsProvider } from "@freenary/ui/lib/labels";
import { SizeProvider } from "@freenary/ui/lib/size-context";
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
import { ffIcons } from "@/lib/ff-icons";
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

// The primitives in @freenary/ui carry their own accessible names for controls
// with no visible text; this is where they learn the reader's language.
const RootDocument = () => (
  // The theme class is decided in the browser, so the server renders none and
  // `ThemeProvider`'s inline script sets it before the first paint.
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
        {/* The app predates the Fluid Functionalism size ladder and was
            designed around 28px controls, so the compact step is the default;
            surfaces that want 36px opt in with size="default". */}
        <SizeProvider defaultSize="compact">
          <IconProvider icons={ffIcons}>
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
          </IconProvider>
        </SizeProvider>
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

  // Answered once per page load from the request's own cookies, so the routes
  // below redirect before the first byte. In the browser it is `unknown` on
  // purpose: after hydration the session is the browser's to hold, and
  // `AuthGate` routes on that — a stale server answer here would fight it.
  beforeLoad: async () => ({
    viewer: isServer ? await getViewer() : UNKNOWN_VIEWER,
  }),

  head: () => {
    // Runs before the module scripts, so the API clients built at module
    // scope in the browser read the container's PUBLIC_SERVER_URL.
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
