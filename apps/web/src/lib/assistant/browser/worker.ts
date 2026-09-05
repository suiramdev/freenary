import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// The engine lives in a worker so a generating model never blocks the page.
const handler = new WebWorkerMLCEngineHandler();

self.addEventListener("message", (message: MessageEvent) => {
  handler.onmessage(message);
});
