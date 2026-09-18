import type { EmailMessage, EmailProvider } from "../types";

export const createLogEmailProvider = (): EmailProvider => ({
  id: "log",
  send: (message: EmailMessage) => {
    console.info(
      `[email:log] to=${message.to} subject=${message.subject}\n${message.text}`
    );

    return Promise.resolve();
  },
});
