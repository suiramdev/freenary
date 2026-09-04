import { emailProvider } from "./registry";
import type { EmailMessage } from "./types";

/**
 * Whether any email adapter is connected. Flows that cannot work without one —
 * one-time codes, password reset — are hidden rather than offered and failed.
 */
export const isEmailEnabled = emailProvider !== null;

export const sendEmail = async (message: EmailMessage): Promise<void> => {
  if (emailProvider === null) {
    throw new Error(
      "No email provider is configured. Set EMAIL_PROVIDER to enable email delivery."
    );
  }
  await emailProvider.send(message);
};
