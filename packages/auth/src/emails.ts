import { sendEmail } from "@freenary/email";
import { Match } from "effect";

import { OTP_EXPIRY_SECONDS } from "./policy";

type OtpPurpose =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

interface OtpEmail {
  subject: string;
  text: string;
}

const SECONDS_PER_MINUTE = 60;
const OTP_EXPIRY_MINUTES = OTP_EXPIRY_SECONDS / SECONDS_PER_MINUTE;

const otpEmail = (purpose: OtpPurpose, otp: string): OtpEmail => {
  const footer = `This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request it, ignore this email — nothing has changed.`;

  return Match.value(purpose).pipe(
    Match.when("email-verification", () => ({
      subject: "Confirm your Freenary email address",
      text: `Your Freenary confirmation code is ${otp}.\n\n${footer}`,
    })),
    Match.when("forget-password", () => ({
      subject: "Reset your Freenary password",
      text: `Your Freenary password reset code is ${otp}.\n\n${footer}`,
    })),
    Match.when("change-email", () => ({
      subject: "Confirm your new Freenary email address",
      text: `Your Freenary confirmation code is ${otp}.\n\n${footer}`,
    })),
    Match.orElse(() => ({
      subject: "Your Freenary verification code",
      text: `Your Freenary verification code is ${otp}.\n\n${footer}`,
    }))
  );
};

export const sendOtpEmail = async (
  email: string,
  otp: string,
  purpose: OtpPurpose
): Promise<void> => {
  const message = otpEmail(purpose, otp);

  await sendEmail({ subject: message.subject, text: message.text, to: email });
};
