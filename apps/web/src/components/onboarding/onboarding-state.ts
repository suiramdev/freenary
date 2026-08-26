interface PersistedState {
  country: string;
  connectedBanks: string[];
}

const STORAGE_KEY = "freenary:onboarding";

export const persistOnboardingState = (state: PersistedState) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
