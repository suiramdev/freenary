import { createFileRoute } from "@tanstack/react-router";
import { llms } from "fumadocs-core/source";

import { source, stableVersion, versionNode } from "@/lib/source";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET() {
        // The newest release alone: one coherent corpus rather than every
        // version of every page.
        const tree = source.getPageTree();
        const node = versionNode(stableVersion());

        return new Response(
          node
            ? `# ${String(tree.name)}\n\n${llms(source).indexNode(node)}`
            : llms(source).index()
        );
      },
    },
  },
});
