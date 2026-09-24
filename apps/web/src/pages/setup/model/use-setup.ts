import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@/paraglide/messages.js";
import { orpc } from "@/shared/api";
import { authClient } from "@/shared/auth";

import { waitForAppliedServer } from "../api/wait-for-server";
import { clearLinkedSetupToken } from "../lib/setup-token-link";

const CLAIM_STEP = "claim";
const FINISH_STEP = "finish";

export const useSetup = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [restartPhase, setRestartPhase] = useState<
    "idle" | "reconnecting" | "stalled"
  >("idle");

  const [chosenStep, setChosenStep] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const status = useQuery(orpc.instance.status.queryOptions());

  const isClaimed = status.data?.claimed ?? false;

  const configuration = useQuery(
    orpc.instance.describe.queryOptions({
      enabled: isClaimed && restartPhase === "idle",
      retry: false,
    })
  );

  const integrationSteps =
    configuration.data?.integrations.map((integration) => integration.id) ?? [];

  const steps = [
    ...(isClaimed ? [] : [CLAIM_STEP]),
    ...integrationSteps,
    FINISH_STEP,
  ];

  const stepId = chosenStep ?? steps[0] ?? CLAIM_STEP;
  const stepIndex = Math.max(steps.indexOf(stepId), 0);

  const goTo = (next: string, heading: 1 | -1) => {
    setDirection(heading);
    setChosenStep(next);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/login" });
  };

  const handleNext = () => {
    const next = steps[stepIndex + 1];

    if (next !== undefined) {
      goTo(next, 1);
    }
  };

  const handleBack = () => {
    const previous = steps[stepIndex - 1];

    if (previous !== undefined) {
      goTo(previous, -1);
    }
  };

  const refreshConfiguration = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.instance.describe.queryOptions().queryKey,
    });
  };

  const claim = useMutation(
    orpc.instance.claim.mutationOptions({
      onError: () => toast.error(m.setup_claim_error()),
      onSuccess: async () => {
        clearLinkedSetupToken();
        toast.success(m.setup_claim_success());

        await queryClient.invalidateQueries({
          queryKey: orpc.instance.status.queryOptions().queryKey,
        });

        await refreshConfiguration();
        setChosenStep(null);
        setDirection(1);
      },
    })
  );

  const save = useMutation(
    orpc.instance.save.mutationOptions({
      onSuccess: async (outcome) => {
        if (outcome.outcome === "saved") {
          await refreshConfiguration();
          handleNext();
        }
      },
    })
  );

  const check = useMutation(orpc.instance.check.mutationOptions());

  const enterApp = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.instance.status.queryOptions().queryKey,
    });

    toast.success(m.setup_completed_toast());
    await navigate({ to: "/" });
  };

  const complete = useMutation(
    orpc.instance.complete.mutationOptions({
      onSuccess: async ({ restarting }) => {
        if (!restarting) {
          await enterApp();

          return;
        }

        setRestartPhase("reconnecting");

        const isBack = await waitForAppliedServer();

        if (!isBack) {
          setRestartPhase("stalled");

          return;
        }

        await refreshConfiguration();
        await enterApp();
      },
    })
  );

  return {
    check,
    claim,
    complete,
    configuration,
    direction,
    handleBack,
    handleNext,
    handleSignOut,
    isClaimed,
    isPending: status.isPending || (isClaimed && configuration.isPending),
    restartPhase,
    save,
    stepId,
    stepIndex,
    steps,
  };
};
