import prisma, { Prisma } from "@freenary/db";

import { deriveMerchantKey } from "../categorisation/merchant-key";
import { getProvider } from "../providers/registry";
import type {
  BankingProvider,
  ProviderHolding,
  ProviderTransaction,
  ProviderUserSession,
} from "../providers/types";
import { isInvestmentAccountType } from "../providers/types";

interface SyncAccount {
  id: string;
  providerAccountId: string;
  type: string;
}

export interface ConnectionWithAccounts {
  id: string;
  provider: string;
  providerSessionId: string;
  institutionName: string;
  institutionCountry: string | null;
  institutionBic: string | null;
  institutionGroup: string | null;
  status: string;
  lastSyncedAt: Date | null;
  accounts: SyncAccount[];
}

// Provider → persistence field mapping (sync writes raw data, no categorisation)

const mapProviderFields = (tx: ProviderTransaction) => ({
  amount: tx.amountMinor,
  balanceAfterTransaction: tx.balanceAfterMinor ?? null,
  bankTransactionCode: tx.bankTransactionDescription ?? null,
  bankTransactionFamilyCode: tx.bankTransactionFamilyCode ?? null,
  bankTransactionSubCode: tx.bankTransactionSubCode ?? null,
  counterpartyName: tx.creditorName ?? tx.debtorName ?? null,
  creditorAccountIban: tx.creditorIban ?? null,
  creditorAgentBic: tx.creditorAgentBic ?? null,
  creditorCountry: tx.creditorCountry ?? null,
  // SAFETY: Prisma requires DbNull (not plain null) to clear a Json? column
  creditorIdentifications: tx.creditorIdentifications
    ? (tx.creditorIdentifications.map(({ identification, schemeName }) => ({
        identification,
        schemeName,
      })) as Prisma.InputJsonValue)
    : Prisma.DbNull,
  creditorTown: tx.creditorTown ?? null,
  currency: tx.currency,
  date: new Date(tx.bookingDate),
  debtorAccountIban: tx.debtorIban ?? null,
  description: tx.remittanceLines.join(" "),
  exchangeRate: tx.exchangeRate ?? null,
  merchantCategoryCode: tx.merchantCategoryCode ?? null,
  psuNote: tx.psuNote ?? null,
  referenceNumber: tx.referenceNumber ?? null,
  referenceNumberScheme: tx.referenceNumberScheme ?? null,
  remittanceLines: tx.remittanceLines,
  status: tx.status,
  transactionDate: tx.transactionDate ? new Date(tx.transactionDate) : null,
  valueDate: tx.valueDate ? new Date(tx.valueDate) : null,
});

// Merchant key derivation for a provider transaction

const deriveKey = (
  tx: ProviderTransaction,
  institutionName: string,
  institutionCountry: string | null,
  institutionBic: string | null,
  institutionGroup: string | null
) =>
  deriveMerchantKey({
    amountMinor: tx.amountMinor,
    bankTransactionFamilyCode: tx.bankTransactionFamilyCode,
    bankTransactionSubCode: tx.bankTransactionSubCode,
    country: institutionCountry,
    creditorIban: tx.creditorIban,
    creditorIdentifications: tx.creditorIdentifications,
    creditorName: tx.creditorName,
    debtorName: tx.debtorName,
    institutionBic,
    institutionGroup,
    institutionName,
    remittanceLines: tx.remittanceLines,
  });

// Transaction upsert (sync only — raw data + merchant key, no categorisation)

const upsertTransaction = async (
  accountId: string,
  tx: ProviderTransaction,
  institutionName: string,
  institutionCountry: string | null,
  institutionBic: string | null,
  institutionGroup: string | null
) => {
  const shared = mapProviderFields(tx);
  const keyResult = deriveKey(
    tx,
    institutionName,
    institutionCountry,
    institutionBic,
    institutionGroup
  );

  await prisma.transaction.upsert({
    create: {
      ...shared,
      accountId,
      category: null,
      categoryOverride: false,
      channel: keyResult.channel,
      intermediaryName: keyResult.intermediaryName,
      merchantKey: keyResult.merchantKey || null,
      normalisedDescriptor: keyResult.normalisedDescriptor || null,
      providerTransactionId: tx.providerTransactionId,
      transactionPath: keyResult.path,
    },
    update: {
      ...shared,
      channel: keyResult.channel,
      intermediaryName: keyResult.intermediaryName,
      merchantKey: keyResult.merchantKey || null,
      normalisedDescriptor: keyResult.normalisedDescriptor || null,
      transactionPath: keyResult.path,
    },
    where: {
      accountId_providerTransactionId: {
        accountId,
        providerTransactionId: tx.providerTransactionId,
      },
    },
  });
};

/**
 * Refreshes the accounts a connection holds, so an account the user activated
 * at the provider after linking appears, and balances stay current. Providers
 * with no account data keep the rows the connection was created with.
 */
const syncProviderAccounts = async (
  provider: BankingProvider,
  connection: ConnectionWithAccounts,
  user: ProviderUserSession | null
): Promise<SyncAccount[]> => {
  const { fetchAccounts } = provider;
  if (!fetchAccounts) {
    return connection.accounts;
  }

  const accounts = await fetchAccounts({
    providerSessionId: connection.providerSessionId,
    user,
  });

  const rows: SyncAccount[] = [];
  for (const account of accounts) {
    const fields = {
      balanceAt: account.balanceAt ? new Date(account.balanceAt) : null,
      balanceMinor: account.balanceMinor ?? null,
      currency: account.currency ?? null,
      iban: account.iban ?? null,
      name: account.name ?? null,
      type: account.type,
    };
    // eslint-disable-next-line no-await-in-loop -- sequential to avoid unique constraint races
    const row = await prisma.bankAccount.upsert({
      create: {
        ...fields,
        connectionId: connection.id,
        providerAccountId: account.providerAccountId,
      },
      select: { id: true, providerAccountId: true, type: true },
      update: fields,
      where: {
        connectionId_providerAccountId: {
          connectionId: connection.id,
          providerAccountId: account.providerAccountId,
        },
      },
    });
    rows.push(row);
  }
  return rows;
};

/**
 * Replaces an account's holdings with what the provider reports now: the table
 * is the last sync's snapshot, so a position that was sold disappears here too.
 */
const syncHoldings = async (
  accountId: string,
  holdings: ProviderHolding[]
): Promise<void> => {
  await prisma.$transaction(async (db) => {
    await db.holding.deleteMany({
      where: {
        accountId,
        providerHoldingId: {
          notIn: holdings.map((holding) => holding.providerHoldingId),
        },
      },
    });

    for (const holding of holdings) {
      const fields = {
        code: holding.code ?? null,
        codeType: holding.codeType ?? null,
        currency: holding.currency,
        label: holding.label,
        quantity: holding.quantity,
        unitCost: holding.unitCost ?? null,
        unitValue: holding.unitValue ?? null,
        unrealisedGainMinor: holding.unrealisedGainMinor ?? null,
        valuationMinor: holding.valuationMinor,
        valuedAt: holding.valuedAt ? new Date(holding.valuedAt) : null,
      };
      // eslint-disable-next-line no-await-in-loop -- sequential to avoid unique constraint races
      await db.holding.upsert({
        create: {
          ...fields,
          accountId,
          providerHoldingId: holding.providerHoldingId,
        },
        update: fields,
        where: {
          accountId_providerHoldingId: {
            accountId,
            providerHoldingId: holding.providerHoldingId,
          },
        },
      });
    }
  });
};

/**
 * How far back a sync with nothing to resume from reaches. Also the window a
 * forced sync re-reads: providers serve roughly this much history, so it is
 * the whole of what re-importing can recover.
 */
const SYNC_HISTORY_DAYS = 90;

export const syncConnection = async (
  connection: ConnectionWithAccounts,
  errors: string[],
  user: ProviderUserSession | null,
  /**
   * Re-read the whole window instead of resuming at `lastSyncedAt`. The upsert
   * re-derives the merchant key of every row it touches, so this is what
   * repairs keys already stored under an older normalisation.
   */
  force = false
) => {
  const {
    institutionBic,
    institutionCountry,
    institutionGroup,
    institutionName,
  } = connection;

  try {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - SYNC_HISTORY_DAYS * 24 * 60 * 60 * 1000
    );
    const syncFrom = force
      ? windowStart
      : (connection.lastSyncedAt ?? windowStart);
    const dateFrom = syncFrom.toISOString().split("T")[0] ?? "";
    const dateTo = now.toISOString().split("T")[0] ?? "";
    const provider = getProvider(connection.provider);
    const accounts = await syncProviderAccounts(provider, connection, user);

    for (const account of accounts) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential to avoid rate-limiting
        const transactions = await provider.fetchTransactions({
          dateFrom,
          dateTo,
          providerAccountId: account.providerAccountId,
          providerSessionId: connection.providerSessionId,
          user,
        });

        for (const tx of transactions) {
          // eslint-disable-next-line no-await-in-loop -- sequential to avoid unique constraint races
          await upsertTransaction(
            account.id,
            tx,
            institutionName,
            institutionCountry,
            institutionBic,
            institutionGroup
          );
        }

        const { fetchHoldings } = provider;
        if (fetchHoldings && isInvestmentAccountType(account.type)) {
          // eslint-disable-next-line no-await-in-loop -- sequential to avoid rate-limiting
          const holdings = await fetchHoldings({
            providerAccountId: account.providerAccountId,
            providerSessionId: connection.providerSessionId,
            user,
          });
          // eslint-disable-next-line no-await-in-loop -- sequential to avoid overwhelming the external API
          await syncHoldings(account.id, holdings);
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unknown account error";
        errors.push(`Account ${account.providerAccountId}: ${msg}`);
      }
    }

    await prisma.bankConnection.update({
      data: { lastSyncedAt: now },
      where: { id: connection.id },
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown connection error";
    errors.push(`Connection ${connection.institutionName}: ${msg}`);
  }
};
