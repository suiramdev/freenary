import { redirect } from "@tanstack/react-router";
import {
  createMiddleware,
  createCsrfMiddleware,
  createStart,
} from "@tanstack/react-start";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";

import { docsRoute, encodeMarkdownUrl } from "@/lib/shared";
import { stableVersion } from "@/lib/source";
import { isVersionId } from "@/lib/versions";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Every page lives under `/docs/<version>`. A path with no version — an old
 * link, a README link — lands on the newest release.
 */
const versionMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);

  if (url.pathname === docsRoute || url.pathname.startsWith(`${docsRoute}/`)) {
    const rest = url.pathname.slice(docsRoute.length).replace(/^\//, "");
    // `/docs/1.2.md` is the Markdown of the version index page, so the segment
    // is read without its extension.
    const first = rest.split("/")[0].replace(/\.md$/, "");

    if (!isVersionId(first)) {
      url.pathname = [docsRoute, stableVersion(), rest]
        .filter(Boolean)
        .join("/");

      // The newest release moves, so this redirect is never permanent.
      throw redirect({ href: url.href });
    }
  }

  return next();
});

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);

  if (
    url.pathname.startsWith(docsRoute) &&
    !url.pathname.endsWith(".md") &&
    isMarkdownPreferred(request)
  ) {
    const slugs = url.pathname
      .slice(docsRoute.length)
      .split("/")
      .filter((v) => v.length > 0);
    url.pathname = encodeMarkdownUrl(slugs);

    // this URL has two representations, selected by `Accept`
    throw redirect({ href: url.href, headers: { Vary: "Accept" } });
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, versionMiddleware, llmMiddleware],
  };
});
