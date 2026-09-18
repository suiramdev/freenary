import { emailProvider } from "./registry";
import type { EmailMessage } from "./types";

export const isEmailEnabled = emailProvider !== null;

export const sendEmail = async (message: EmailMessage): Promise<void> => {
  if (emailProvider === null) {
    throw new Error(
      "No email provider is configured. Set EMAIL_PROVIDER to enable email delivery."
    );
  }

  await emailProvider.send(message);
};
