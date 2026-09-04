export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text only: every message this app sends is a short transactional notice. */
  text: string;
}

/**
 * An interchangeable email connector. Mirrors the banking provider boundary in
 * `packages/api/src/providers` — the app never talks to a vendor SDK directly.
 */
export interface EmailProvider {
  readonly id: string;
  send: (message: EmailMessage) => Promise<void>;
}
