import { createFileRoute } from "@tanstack/react-router";

import { chatHandler } from "../api/chat";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: chatHandler,
    },
  },
});
