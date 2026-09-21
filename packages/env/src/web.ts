import { createEnv } from "@t3-oss/env-core";

import { clientEnvSchema } from "./schema-web";

// SAFETY: import.meta.env is Vite's typed env object; @t3-oss/env-core expects a plain record
const runtimeEnv = import.meta.env as Record<string, string | undefined>;

export const env = createEnv({
  client: clientEnvSchema,
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv,
});
