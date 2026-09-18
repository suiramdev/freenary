import { Predicate } from "effect";

import type { ProviderAccount, ProviderAccountType } from "../types";
import type { PowensAccount, PowensAccountType } from "./client";
import { isReported, precisionOf, toIsoDateTime, toMinorUnits } from "./client";

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

const accountTypeName = (type: PowensAccountType | null | undefined): string =>
  Predicate.isString(type) ? type : (type?.name ?? "");

export const mapPowensAccount = (account: PowensAccount): ProviderAccount => {
  const precision = precisionOf(account);
  const { balance } = account;
  const typeName = accountTypeName(account.type);

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
