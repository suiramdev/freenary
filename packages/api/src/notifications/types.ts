export const NOTIFICATION_TYPES = {
  bankConnectionNeedsReconnect: "bank_connection_needs_reconnect",
  transactionsToCheck: "transactions_to_check",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const isNotificationType = (value: string): value is NotificationType =>
  Object.values(NOTIFICATION_TYPES).some((type) => type === value);
