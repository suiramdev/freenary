import type { EmailMessage, EmailProvider } from "../types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface ResendCredentials {
  apiKey: string;
  from: string;
}

/**
 * Resend over its REST API rather than the vendor SDK: one `fetch` covers the
 * whole surface this app uses, and no dependency ships to production for it.
 */
export const createResendEmailProvider = (
  credentials: ResendCredentials
): EmailProvider => ({
  id: "resend",
  send: async (message: EmailMessage) => {
    const response = await fetch(RESEND_ENDPOINT, {
      body: JSON.stringify({
        from: credentials.from,
        subject: message.subject,
        text: message.text,
        to: [message.to],
      }),
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Resend rejected the message (${response.status}): ${body}`
      );
    }
  },
});
