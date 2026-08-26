import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// SAFETY: import.meta.env is Vite's typed env object; cast needed because @t3-oss/env-core expects plain Record
const runtimeEnv = import.meta.env as Record<string, string | undefined>;

export const env = createEnv({
  client: {
    VITE_SERVER_URL: z.url().default("http://localhost:3000"),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv,
});
