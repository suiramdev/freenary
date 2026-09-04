import { z } from "zod";

import type { ProviderAccount, ProviderAccountType } from "../types";
import type { PowensAccount } from "./client";
import { isReported, precisionOf, toIsoDateTime, toMinorUnits } from "./client";

/** Powens account type names, as documented per domain product. */
const ACCOUNT_TYPE_MAP = {
  article83: "RETIREMENT",
  capitalisation: "LIFE_INSURANCE",
  card: "CARD",
  cat: "SAVINGS",
  cel: "SAVINGS",
  checking: "CHECKING",
  crowdlending: "CROWDLENDING",
  csl: "SAVINGS",
  deposit: "SAVINGS",
  ldds: "SAVINGS",
  lifeinsurance: "LIFE_INSURANCE",
  livret_a: "SAVINGS",
  livret_b: "SAVINGS",
  loan: "LOAN",
  madelin: "RETIREMENT",
  market: "BROKERAGE",
  pea: "BROKERAGE",
  pee: "EMPLOYEE_SAVINGS",
  pel: "SAVINGS",
  per: "RETIREMENT",
  perco: "RETIREMENT",
  perp: "RETIREMENT",
  real_estate: "REAL_ESTATE",
  rsp: "EMPLOYEE_SAVINGS",
  savings: "SAVINGS",
} satisfies Record<string, ProviderAccountType>;

const isKnownAccountType = (
  name: string
): name is keyof typeof ACCOUNT_TYPE_MAP =>
  Object.hasOwn(ACCOUNT_TYPE_MAP, name);

/**
 * Powens documents the account type as `{ name }`; domains send a bare string.
 * Both decode to the type name, and anything else to none.
 */
const accountTypeName = z.union([
  z.string(),
  z.object({ name: z.string().nullish() }).transform((type) => type.name ?? ""),
]);

export const mapPowensAccount = (account: PowensAccount): ProviderAccount => {
  const precision = precisionOf(account);
  const { balance } = account;
  const parsedType = accountTypeName.safeParse(account.type);
  const typeName = parsedType.success ? parsedType.data : "";

  return {
    balanceAt: toIsoDateTime(account.last_update),
    balanceMinor: isReported(balance)
      ? toMinorUnits(balance, precision)
      : undefined,
    currency: account.currency?.id ?? undefined,
    iban: account.iban ?? undefined,
    name: account.name ?? account.original_name ?? undefined,
    providerAccountId: String(account.id),
    type: isKnownAccountType(typeName) ? ACCOUNT_TYPE_MAP[typeName] : "UNKNOWN",
  };
};
