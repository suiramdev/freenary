import { z } from "zod";

export const clientEnvSchema = {
  VITE_FREENARY_VERSION: z
    .string()
    .optional()
    .describe(
      "The release the account menu links to. `1.2.0` opens the `1.2` documentation; any other value, and an empty one, opens the `next` documentation. The Dockerfile fills it from the `FREENARY_VERSION` build argument."
    )
    .meta({ example: "1.2.0" }),
  VITE_SERVER_URL: z
    .url()
    .default("http://localhost:3000")
    .describe(
      "The build-time fallback API origin. It applies only while `SERVER_URL` and `PUBLIC_SERVER_URL` are both unset."
    )
    .meta({ example: "https://api.example.com" }),
} as const;
