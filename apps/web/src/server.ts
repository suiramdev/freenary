import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "@/paraglide/server.js";

// Puts the request's locale in async storage before the render runs, so
// `getLocale()` returns the visitor's language during SSR instead of the base
// locale — without it the first paint is always English and then swaps.
export default {
  fetch: async (request: Request): Promise<Response> => {
    const response = await paraglideMiddleware(request, () =>
      handler.fetch(request)
    );

    // The same URL now answers in different languages depending on these two
    // headers. Unauthenticated pages like /login are cacheable, so a proxy that
    // does not know that would serve one visitor's language to the next.
    const localized = new Response(response.body, response);
    localized.headers.append("Vary", "Accept-Language, Cookie");
    return localized;
  },
};
