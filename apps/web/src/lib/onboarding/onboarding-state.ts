import { Option } from "effect";
import { z } from "zod";

import { isServer } from "@/lib/is-server";

export interface OnboardingState {
  country: string;
}

const STORAGE_KEY = "freenary:onboarding";

const onboardingStateSchema: z.ZodType<OnboardingState> = z.object({
  country: z.string(),
});

const decodeStoredState = Option.liftThrowable((raw: string) =>
  onboardingStateSchema.parse(JSON.parse(raw))
);

export const persistOnboardingState = (state: OnboardingState) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const storedState = (): string | null =>
  isServer ? null : sessionStorage.getItem(STORAGE_KEY);

export const loadOnboardingState = (): OnboardingState | null =>
  Option.fromNullishOr(storedState()).pipe(
    Option.flatMap(decodeStoredState),
    Option.getOrElse(() => null)
  );

export const clearOnboardingState = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};
