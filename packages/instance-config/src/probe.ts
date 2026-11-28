import { Data, Match } from "effect";

export const PROBE_TIMEOUT_MS = 10_000;

export const probeDeadline = (
  signal: AbortSignal,
timeoutMs: number = PROBE_TIMEOUT_MS,
): AbortSignal =>
  AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);

export type ProbeFailureReason =
  | { readonly kind: "unreachable"; readonly detail: string }
  | { readonly kind: "timeout"; readonly detail: string }
  | {
      readonly kind: "rejected";
      readonly status: number;
      readonly detail: string;
    }
  | { readonly kind: "invalid"; readonly detail: string };

export class IntegrationProbeFailed extends Data.TaggedError(
  "IntegrationProbeFailed"
)<{
  readonly integrationId: string;
  readonly variantId: string;
  readonly reason: ProbeFailureReason;
}> {
  override get message(): string {
    const subject = `${this.integrationId} (${this.variantId})`;

    return Match.value(this.reason).pipe(
      Match.discriminatorsExhaustive("kind")({
        invalid: ({ detail }) =>
          `${subject} was given a value this instance cannot use: ${detail}`,
        rejected: ({ detail, status }) =>
          `${subject} refused the credentials: ${status} ${detail}`,
        timeout: ({ detail }) =>
          `${subject} did not answer in time: ${detail}`,
        unreachable: ({ detail }) =>
          `${subject} could not be reached: ${detail}`,
      })
    );
  }
}
