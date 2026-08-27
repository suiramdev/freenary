import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  clearOnboardingState,
  loadOnboardingState,
  persistOnboardingState,
} from "@/lib/onboarding/onboarding-state";
import { client, orpc } from "@/utils/orpc";

export const useOnboardingWizard = ({
  hasBankStep,
}: {
  hasBankStep: boolean;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(() => (loadOnboardingState() ? 1 : 0));
  const [country, setCountry] = useState<string | null>(
    () => loadOnboardingState()?.country ?? null
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const [connectedBanks, setConnectedBanks] = useState<ReadonlySet<string>>(
    () => new Set(loadOnboardingState()?.connectedBanks)
  );

  const handleBankConnected = (name: string) => {
    setConnectedBanks((prev) => {
      const next = new Set(prev).add(name);
      if (country) {
        persistOnboardingState({ connectedBanks: [...next], country });
      }
      return next;
    });
  };

  const completeOnboarding = async () => {
    if (!country) {
      return;
    }
    setIsCompleting(true);
    const result = await client.onboarding
      .completeOnboarding({ country })
      .then(() => true as const)
      .catch(() => false as const);

    if (result) {
      await queryClient.invalidateQueries({
        queryKey: orpc.onboarding.getStatus.queryOptions().queryKey,
      });
      toast.success("You're all set!");
      navigate({ to: "/" });
    } else {
      toast.error("Something went wrong. Please try again.");
    }
    setIsCompleting(false);
  };

  const handleCountryContinue = () => {
    if (hasBankStep) {
      if (country) {
        persistOnboardingState({
          connectedBanks: [...connectedBanks],
          country,
        });
      }
      setStep(1);
      return;
    }
    clearOnboardingState();
    void completeOnboarding();
  };

  const handleFinish = () => {
    clearOnboardingState();
    void completeOnboarding();
  };

  const handleSignOut = () => {
    clearOnboardingState();
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate({ to: "/login" }),
      },
    });
  };

  return {
    connectedBanks,
    country,
    handleBack: () => setStep(0),
    handleBankConnected,
    handleCountryContinue,
    handleCountrySelect: setCountry,
    handleFinish,
    handleSignOut,
    isCompleting,
    step,
  };
};
