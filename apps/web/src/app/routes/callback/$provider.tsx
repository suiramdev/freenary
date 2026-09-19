import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  BankConnectionCallback,
  ConnectingBank,
  exchangeCallback,
} from "@/pages/callback";

const callbackSearchSchema = z
  .record(z.string(), z.unknown())
  .transform((search) => {
    const providerSentParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(search)) {
      if (value !== undefined && value !== null) {
        providerSentParams[key] =
          value instanceof Object ? JSON.stringify(value) : String(value);
      }
    }

    return providerSentParams;
  });

export const Route = createFileRoute("/callback/$provider")({
  ssr: false,
  pendingComponent: ConnectingBank,
  validateSearch: callbackSearchSchema,
  beforeLoad: ({ params, search }) => exchangeCallback({ params, search }),
  component: BankConnectionCallback,
});
