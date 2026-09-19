import { Button } from "@freenary/ui/components/button";
import { FieldSeparator } from "@freenary/ui/components/field";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { useSize } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";

import { m } from "@/paraglide/messages.js";
import { useWebAuthnSupport } from "@/shared/lib/use-webauthn-support";

import type {
  AuthCapabilities,
  OauthProvider,
} from "../model/auth-capabilities";

interface AuthSignInOptionsProps {
  capabilities: AuthCapabilities | undefined;
  isError: boolean;
  isPasskeyPending: boolean;
  onPasskey: () => void;
  onProvider: (provider: string) => void;
  onRetry: () => void;
  pendingProvider: string | null;
}

const LABEL_FN_BY_PROVIDER = {
  apple: m.auth_oauth_apple,
  google: m.auth_oauth_google,
} satisfies Record<string, () => string>;

const providerLabel = (provider: OauthProvider) => {
  if (Object.hasOwn(LABEL_FN_BY_PROVIDER, provider.id)) {
    // SAFETY: hasOwn just proved provider.id is one of this object's keys.
    return LABEL_FN_BY_PROVIDER[
      provider.id as keyof typeof LABEL_FN_BY_PROVIDER
    ]();
  }

  return provider.name === null
    ? m.auth_oauth_sso()
    : m.auth_oauth_provider({ provider: provider.name });
};

export const AuthSignInOptions = ({
  capabilities,
  isError,
  isPasskeyPending,
  onPasskey,
  onProvider,
  onRetry,
  pendingProvider,
}: AuthSignInOptionsProps) => {
  const isWebAuthnSupported = useWebAuthnSupport();
  const size = useSize();

  if (capabilities === undefined && isError) {
    return (
      <div className="mt-6 flex flex-col items-start gap-2">
        <output className="text-muted-foreground text-sm">
          {m.auth_methods_load_error()}
        </output>
        <Button size="sm" type="button" variant="tertiary" onClick={onRetry}>
          {m.auth_retry()}
        </Button>
      </div>
    );
  }

  const isPasskeySupportUndecided =
    capabilities !== undefined &&
    capabilities.passkey &&
    isWebAuthnSupported === null;

  if (capabilities === undefined || isPasskeySupportUndecided) {
    return (
      <div aria-busy="true" className="mt-6 flex flex-col gap-2">
        <output className="sr-only">{m.auth_loading_methods()}</output>
        <Skeleton
          aria-hidden="true"
          className={cn(size.control, "w-full rounded-md")}
        />
      </div>
    );
  }

  const hasPasskey = capabilities.passkey && isWebAuthnSupported === true;
  const hasPasswordlessOption = hasPasskey || capabilities.oauth.length > 0;

  if (!hasPasswordlessOption) {
    return null;
  }

  const isRedirecting = pendingProvider !== null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <FieldSeparator>{m.auth_divider_or()}</FieldSeparator>
      <div className="flex flex-col gap-2">
        {hasPasskey && (
          <Button
            disabled={isPasskeyPending || isRedirecting}
            loading={isPasskeyPending}
            size="lg"
            type="button"
            variant="tertiary"
            onClick={onPasskey}
          >
            {m.auth_passkey_submit()}
          </Button>
        )}

        {capabilities.oauth.map((provider) => (
          <Button
            key={provider.id}
            disabled={isRedirecting || isPasskeyPending}
            loading={pendingProvider === provider.id}
            size="lg"
            type="button"
            variant="tertiary"
            onClick={() => onProvider(provider.id)}
          >
            {providerLabel(provider)}
          </Button>
        ))}
      </div>
    </div>
  );
};
