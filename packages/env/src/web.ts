import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// SAFETY: import.meta.env is Vite's typed env object; @t3-oss/env-core expects a plain record
const runtimeEnv = import.meta.env as Record<string, string | undefined>;

export const env = createEnv({
  client: {
    VITE_FREENARY_VERSION: z
      .string()
      .optional()
      .describe(
        "Release tag CI passes as a build argument, so one image is one version. A branch build carries dev or main."
      ),
    VITE_SERVER_URL: z.url().default("http://localhost:3000"),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv,
});
