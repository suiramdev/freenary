import type { TimeRange } from "@/lib/budget/period";
import type { Transaction } from "@/lib/budget/transaction";
import { m } from "@/paraglide/messages.js";
import type { Locale } from "@/paraglide/runtime.js";

interface GroupHeader {
  type: "header";
  key: string;
  label: string;
  total: number;
  currency: string;
}

export type VirtualItem =
  | GroupHeader
  | { type: "tx"; key: string; tx: Transaction };

export const HEADER_HEIGHT = 40;
export const ROW_HEIGHT = 56;

/**
 * Build a grouping key from a date string.
 * 1M → day, 3M → week (ISO week starting Monday), 1Y → month.
 */
export const groupKey = (dateStr: string, range: TimeRange): string => {
  const d = new Date(dateStr);

  if (range === "1Y") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  if (range === "3M") {
    // ISO week: find Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return `${monday.getFullYear()}-W${String(Math.ceil((monday.getDate() + new Date(monday.getFullYear(), monday.getMonth(), 1).getDay()) / 7)).padStart(2, "0")}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  }

  // 1M → day
  return d.toISOString().slice(0, 10);
};

const formatShortDate = (date: Date, locale: Locale) =>
  date.toLocaleDateString(locale, { day: "numeric", month: "short" });

export const formatGroupLabel = (
  key: string,
  range: TimeRange,
  locale: Locale
): string => {
  if (range === "1Y") {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1);
    return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }

  if (range === "3M") {
    // key is like "2025-W03-08-12" — extract the monday date from the last parts
    const parts = key.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[2]) - 1;
    const day = Number(parts[3]);
    const monday = new Date(year, month, day);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return `${formatShortDate(monday, locale)} – ${formatShortDate(sunday, locale)}`;
  }

  // 1M → day
  const d = new Date(`${key}T00:00:00`);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (key === today) {
    return m.budget_group_today();
  }
  if (key === yesterdayStr) {
    return m.budget_group_yesterday();
  }
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
};

export const buildVirtualItems = (
  transactions: Transaction[],
  range: TimeRange,
  locale: Locale
): VirtualItem[] => {
  if (transactions.length === 0) {
    return [];
  }

  const items: VirtualItem[] = [];
  let currentKey = "";
  let groupTotal = 0;
  // Header totals are only known once the group ends, so the header object is
  // kept and patched in place after the fact.
  let openHeader: GroupHeader | null = null;

  for (const tx of transactions) {
    const key = groupKey(tx.date, range);
    if (key !== currentKey) {
      if (openHeader) {
        openHeader.total = groupTotal;
      }
      currentKey = key;
      groupTotal = 0;
      openHeader = {
        currency: tx.currency,
        key: `header-${key}`,
        label: formatGroupLabel(key, range, locale),
        total: 0,
        type: "header",
      };
      items.push(openHeader);
    }
    groupTotal += tx.amount;
    items.push({ key: tx.id, tx, type: "tx" });
  }

  if (openHeader) {
    openHeader.total = groupTotal;
  }

  return items;
};
