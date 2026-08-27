import { z } from "zod";

import type { ProviderInstitution } from "../providers/types";

const bankConnectionStateSchema = z.object({
  institution: z.object({
    country: z.string(),
    id: z.string(),
    name: z.string(),
  }),
  original: z.string().optional(),
  providerId: z.string(),
});

export type BankConnectionState = z.infer<typeof bankConnectionStateSchema>;

export const encodeBankConnectionState = (
  providerId: string,
  institution: ProviderInstitution,
  original?: string
): string => {
  const state: BankConnectionState = {
    institution: {
      country: institution.country,
      id: institution.id,
      name: institution.name,
    },
    providerId,
  };
  if (original !== undefined) {
    state.original = original;
  }
  return JSON.stringify(state);
};

export const parseBankConnectionState = (state: string): BankConnectionState =>
  bankConnectionStateSchema.parse(JSON.parse(state));

export const findInstitution = (
  institutions: ProviderInstitution[],
  institutionId: string,
  country: string
): ProviderInstitution | undefined =>
  institutions.find(
    (institution) =>
      institution.id === institutionId && institution.country === country
  );
