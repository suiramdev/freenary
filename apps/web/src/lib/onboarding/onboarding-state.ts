export interface OnboardingState {
  country: string;
  connectedBanks: string[];
}

const STORAGE_KEY = "freenary:onboarding";

export const persistOnboardingState = (state: OnboardingState) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadOnboardingState = (): OnboardingState | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    // SAFETY: sessionStorage JSON is written by persistOnboardingState with the OnboardingState shape
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
};

export const clearOnboardingState = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};
