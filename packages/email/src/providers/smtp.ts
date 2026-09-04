import { createTransport } from "nodemailer";

import type { EmailMessage, EmailProvider } from "../types";

interface SmtpCredentials {
  from: string;
  host: string;
  port: number;
  /** Implicit TLS (usually port 465); STARTTLS is negotiated when this is off. */
  secure: boolean;
  user?: string;
  password?: string;
}

export const createSmtpEmailProvider = (
  credentials: SmtpCredentials
): EmailProvider => {
  // One pooled transport for the process: without `pool` nodemailer opens a
  // fresh TCP+TLS handshake for every message.
  const transport = createTransport({
    auth:
      credentials.user === undefined
        ? undefined
        : { pass: credentials.password, user: credentials.user },
    host: credentials.host,
    pool: true,
    port: credentials.port,
    secure: credentials.secure,
  });

  return {
    id: "smtp",
    send: async (message: EmailMessage) => {
      await transport.sendMail({
        from: credentials.from,
        subject: message.subject,
        text: message.text,
        to: message.to,
      });
    },
  };
};
