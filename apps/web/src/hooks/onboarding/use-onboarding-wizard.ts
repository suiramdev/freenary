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
import { m } from "@/paraglide/messages.js";
import { client, orpc } from "@/utils/orpc";

export const useOnboardingWizard = ({
  hasBankStep,
}: {
  hasBankStep: boolean;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetch: refetchSession } = authClient.useSession();
  const [step, setStep] = useState(() => (loadOnboardingState() ? 1 : 0));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [taxCountries, setTaxCountries] = useState<string[]>(
    () => loadOnboardingState()?.taxCountries ?? []
  );
  const [isCompleting, setIsCompleting] = useState(false);

  const completeOnboarding = async () => {
    if (taxCountries.length === 0) {
      return;
    }

    setIsCompleting(true);
    const wasCompleted = await client.onboarding
      .completeOnboarding({ taxCountries })
      .then(() => true as const)
      .catch(() => false as const);

    if (wasCompleted) {
      await queryClient.invalidateQueries({
        queryKey: orpc.onboarding.getStatus.queryOptions().queryKey,
      });
      toast.success(m.onboarding_completed_toast());
      navigate({ to: "/" });
    } else {
      toast.error(m.onboarding_error_generic());
    }

    setIsCompleting(false);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(0);
  };

  const handleCountryContinue = () => {
    if (hasBankStep) {
      if (taxCountries.length > 0) {
        persistOnboardingState({ taxCountries });
      }

      setDirection(1);
      setStep(1);

      return;
    }

    clearOnboardingState();
    void completeOnboarding();
  };

  const handleCountryToggle = (code: string) => {
    setTaxCountries((current) =>
      current.includes(code)
        ? current.filter((held) => held !== code)
        : [...current, code]
    );
  };

  const handleFinish = () => {
    clearOnboardingState();
    void completeOnboarding();
  };

  const handleSignOut = () => {
    clearOnboardingState();
    authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          await refetchSession();
          await navigate({ to: "/login" });
          queryClient.clear();
        },
      },
    });
  };

  return {
    direction,
    handleBack,
    handleCountryContinue,
    handleCountryToggle,
    handleFinish,
    handleSignOut,
    isCompleting,
    step,
    taxCountries,
  };
};
