import { createFileRoute } from "@tanstack/react-router";

import { getLLMText, source, stableVersion } from "@/lib/source";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => {
        // Same scope as `/llms.txt`: the newest release.
        const stable = stableVersion();
        const scan = source
          .getPages()
          .filter((page) => page.slugs[0] === stable)
          .map(getLLMText);
        const scanned = await Promise.all(scan);
        return new Response(scanned.join("\n\n"));
      },
    },
  },
});
