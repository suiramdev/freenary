import { Data, Match } from "effect";

export type ProbeFailureReason =
  | { readonly kind: "unreachable"; readonly detail: string }
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
        unreachable: ({ detail }) =>
          `${subject} could not be reached: ${detail}`,
      })
    );
  }
}
