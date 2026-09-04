import type { EmailMessage, EmailProvider } from "../types";

/**
 * Development adapter: prints the message, including any one-time code, to the
 * server log instead of delivering it. `createEmailProvider` refuses it in
 * production, so it can never stand in for a real transport there.
 */
export const createLogEmailProvider = (): EmailProvider => ({
  id: "log",
  send: (message: EmailMessage) => {
    console.info(
      `[email:log] to=${message.to} subject=${message.subject}\n${message.text}`
    );
    return Promise.resolve();
  },
});
