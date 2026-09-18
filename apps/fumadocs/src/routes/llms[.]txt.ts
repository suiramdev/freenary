import { createFileRoute } from "@tanstack/react-router";
import { llms } from "fumadocs-core/source";

import { newestRelease, source, versionNode } from "@/lib/source";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET() {
        const tree = source.getPageTree();
        const node = versionNode(newestRelease());

        return new Response(
          node
            ? `# ${String(tree.name)}\n\n${llms(source).indexNode(node)}`
            : llms(source).index()
        );
      },
    },
  },
});
