import { cors } from "@elysiajs/cors";
import { handleAssistantChat } from "@freenary/api/assistant/handler";
import { createContext } from "@freenary/api/context";
import { appRouter } from "@freenary/api/routers/index";
import { auth } from "@freenary/auth";
import { env } from "@freenary/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/elysia";
import { createFsDrain } from "evlog/fs";

const SERVER_ERROR_STATUS = 500;

const rpcHandler = new RPCHandler(appRouter, {
  // Only faults reach the console. A refused call is an answer the caller
  // asked for — an unauthenticated read, a rejected input — and printing its
  // stack buries the crashes worth reading; the request's own wide event
  // already records that it was refused.
  interceptors: [
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- oRPC interceptor API uses callback pattern
    onError((error) => {
      if (
        !(error instanceof ORPCError) ||
        error.status >= SERVER_ERROR_STATUS
      ) {
        console.error(error);
      }
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  // Faults only, as above.
  interceptors: [
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- oRPC interceptor API uses callback pattern
    onError((error) => {
      if (
        !(error instanceof ORPCError) ||
        error.status >= SERVER_ERROR_STATUS
      ) {
        console.error(error);
      }
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

/**
 * Elysia leaves `set.status` at its default when a handler returns a `Response`
 * of its own, and the request's wide event reads exactly that — so every
 * refusal on the three routes below would be recorded as a 200. Copying the
 * real status back is what keeps the log honest.
 */
const recordStatus = (
  set: { status?: number | string },
  response: Response
) => {
  set.status = response.status;
  return response;
};

initLogger({
  env: { service: "freenary-server" },
});

// SAFETY: auth is created by better-auth which satisfies BetterAuthInstance; cast needed for evlog middleware typing
const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

new Elysia()
  .use(
    evlog({
      drain:
        process.env.NODE_ENV === "production" ? undefined : createFsDrain(),
    })
  )
  .derive(async ({ request, log }) => {
    await identifyUser(log, request.headers, new URL(request.url).pathname);
    return {};
  })
  .use(
    cors({
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      origin: env.CORS_ORIGIN,
    })
  )
  .all("/api/auth/*", async (context) => {
    const { request, set, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return recordStatus(set, await auth.handler(request));
    }
    return status(405);
  })
  .all(
    "/rpc*",
    async (context) => {
      const { response } = await rpcHandler.handle(context.request, {
        context: await createContext({ context }),
        prefix: "/rpc",
      });
      return recordStatus(
        context.set,
        response ?? new Response("Not Found", { status: 404 })
      );
    },
    {
      parse: "none",
    }
  )
  // Token streaming does not fit a unary oRPC procedure, so the assistant's
  // stream is a raw route; everything it reads still goes through `appRouter`.
  // `parse: "none"` for the same reason as /rpc*: Elysia would eat the body.
  .post(
    "/ai/chat",
    (context) =>
      handleAssistantChat({ log: context.log, request: context.request }),
    {
      parse: "none",
    }
  )
  .all(
    "/api-reference*",
    async (context) => {
      const { response } = await apiHandler.handle(context.request, {
        context: await createContext({ context }),
        prefix: "/api-reference",
      });
      return recordStatus(
        context.set,
        response ?? new Response("Not Found", { status: 404 })
      );
    },
    {
      parse: "none",
    }
  )
  .get("/", () => "OK")
  .listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });
