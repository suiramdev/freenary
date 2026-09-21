import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";

import { serverEnvSchema } from "./schema";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: serverEnvSchema,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
