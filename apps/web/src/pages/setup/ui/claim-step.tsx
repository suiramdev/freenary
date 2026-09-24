import { Button } from "@freenary/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import { useEffect, useId, useState } from "react";

import { m } from "@/paraglide/messages.js";
import { WizardStepHeader } from "@/shared/ui/wizard-step-header";

import {
  readLinkedSetupToken,
  subscribeToSetupTokenLink,
} from "../lib/setup-token-link";

interface ClaimStepProps {
  isSubmitting: boolean;
  onClaim: (token: string) => void;
}

export const ClaimStep = ({ isSubmitting, onClaim }: ClaimStepProps) => {
  const inputId = useId();
  const [token, setToken] = useState(readLinkedSetupToken);

  useEffect(
    () => subscribeToSetupTokenLink(() => setToken(readLinkedSetupToken())),
    []
  );

  const trimmed = token.trim();

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={m.setup_claim_description()}
        title={m.setup_claim_title()}
      />
      <Field>
        <FieldLabel htmlFor={inputId}>{m.setup_claim_token_label()}</FieldLabel>
        <Input
          autoComplete="off"
          id={inputId}
          onChange={(event) => setToken(event.target.value)}
          value={token}
        />
        <FieldDescription>{m.setup_claim_token_hint()}</FieldDescription>
      </Field>
      <div className="flex items-center justify-end">
        <Button
          disabled={trimmed.length === 0}
          loading={isSubmitting}
          onClick={() => onClaim(trimmed)}
          type="button"
        >
          {m.setup_claim_submit()}
        </Button>
      </div>
    </div>
  );
};
