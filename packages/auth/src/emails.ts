import { sendEmail } from "@freenary/email";

import { OTP_EXPIRY_SECONDS } from "./policy";

const OTP_EXPIRY_MINUTES = OTP_EXPIRY_SECONDS / 60;

type OtpPurpose =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

interface OtpEmail {
  subject: string;
  text: string;
}

// Server-side copy is English only: Paraglide's catalogs live in `apps/web` and
// the locale a user picked in the browser is not carried on the auth request.
const otpEmail = (purpose: OtpPurpose, otp: string): OtpEmail => {
  const footer = `This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request it, ignore this email — nothing has changed.`;

  // No `sign-in` arm: the policy hook refuses that code purpose, so a
  // "your sign-in code" message can never be issued. The default below is what
  // a refused purpose would fall through to.
  switch (purpose) {
    case "email-verification": {
      return {
        subject: "Confirm your Freenary email address",
        text: `Your Freenary confirmation code is ${otp}.\n\n${footer}`,
      };
    }
    case "forget-password": {
      return {
        subject: "Reset your Freenary password",
        text: `Your Freenary password reset code is ${otp}.\n\n${footer}`,
      };
    }
    case "change-email": {
      return {
        subject: "Confirm your new Freenary email address",
        text: `Your Freenary confirmation code is ${otp}.\n\n${footer}`,
      };
    }
    default: {
      return {
        subject: "Your Freenary verification code",
        text: `Your Freenary verification code is ${otp}.\n\n${footer}`,
      };
    }
  }
};

export const sendOtpEmail = async (
  email: string,
  otp: string,
  purpose: OtpPurpose
): Promise<void> => {
  const message = otpEmail(purpose, otp);
  await sendEmail({ subject: message.subject, text: message.text, to: email });
};
