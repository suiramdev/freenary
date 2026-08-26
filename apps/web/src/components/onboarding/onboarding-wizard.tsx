import { Button } from "@freenary/ui/components/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ShaderBackground } from "@/components/shader-background";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

import { BankConnectionStep } from "./bank-connection-step";
import { CountrySelectionStep } from "./country-selection-step";
import { OnboardingStepper } from "./onboarding-stepper";

const STEPS = ["Country", "Bank connection"] as const;
const STEPS_WITHOUT_BANKING = ["Country"] as const;
const STORAGE_KEY = "freenary:onboarding";

interface PersistedState {
  country: string;
  connectedBanks: string[];
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {return null;}
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function persistOnboardingState(state: PersistedState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearPersistedState() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(() => {
    const saved = loadPersistedState();
    return saved ? 1 : 0;
  });
  const [country, setCountry] = useState<string | null>(() => {
    const saved = loadPersistedState();
    return saved?.country ?? null;
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [connectedBanks, setConnectedBanks] = useState<ReadonlySet<string>>(
    () => {
      const saved = loadPersistedState();
      return new Set(saved?.connectedBanks);
    }
  );

  const ebAvailability = useQuery(
    orpc.onboarding.getEnableBankingAvailability.queryOptions()
  );

  const enableBankingAvailable = ebAvailability.data?.available ?? false;
  const steps = enableBankingAvailable ? STEPS : STEPS_WITHOUT_BANKING;
  const hasBankStep = enableBankingAvailable;

  const markBankConnected = (name: string) => {
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
    } else {
      clearPersistedState();
      void completeOnboarding();
    }
  };

  const handleFinish = () => {
    clearPersistedState();
    void completeOnboarding();
  };

  const handleSignOut = () => {
    clearPersistedState();
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate({ to: "/login" }),
      },
    });
  };

  return (
    <main className="bg-background relative flex min-h-svh flex-col">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <ShaderBackground />
      </div>
      <div className="relative z-10 flex items-center justify-end px-4 py-3">
        <Button onClick={handleSignOut} size="sm" type="button" variant="ghost">
          Sign out
        </Button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-8">
          {ebAvailability.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <SpinnerGapIcon className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : (
            <>
              <OnboardingStepper current={step} steps={steps} />
              {step === 0 ? (
                <CountrySelectionStep
                  onContinue={handleCountryContinue}
                  onSelect={setCountry}
                  selected={country}
                />
              ) : (
                <BankConnectionStep
                  connected={connectedBanks}
                  country={country ?? ""}
                  onBack={() => setStep(0)}
                  onConnected={markBankConnected}
                  onFinish={handleFinish}
                />
              )}
              {isCompleting && (
                <div className="flex items-center justify-center">
                  <SpinnerGapIcon className="text-muted-foreground size-4 animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
};
