import { createFileRoute } from "@tanstack/react-router";

import { getLLMText, newestRelease, source } from "@/lib/source";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => {
        const newest = newestRelease();
        const scan = source
          .getPages()
          .filter((page) => page.slugs[0] === newest)
          .map(getLLMText);
        const scanned = await Promise.all(scan);

        return new Response(scanned.join("\n\n"));
      },
    },
  },
});
