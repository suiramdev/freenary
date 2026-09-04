import { Button } from "@freenary/ui/components/button";
import { FieldSeparator } from "@freenary/ui/components/field";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { Spinner } from "@freenary/ui/components/spinner";

import { useWebAuthnSupport } from "@/hooks/shared/use-webauthn-support";
import type {
  AuthCapabilities,
  OauthProvider,
} from "@/lib/auth/auth-capabilities";
import { m } from "@/paraglide/messages.js";

// Holds the message functions rather than their results: a module is evaluated
// once per server process, so a called message would pin the first request's
// locale for everyone after it.
const LABEL_BY_PROVIDER = {
  apple: m.auth_oauth_apple,
  google: m.auth_oauth_google,
} satisfies Record<string, () => string>;

/** An operator's name for their own OIDC provider is data, so it goes into the
 * sentence untouched instead of being translated. */
const providerLabel = (provider: OauthProvider) => {
  if (Object.hasOwn(LABEL_BY_PROVIDER, provider.id)) {
    // SAFETY: hasOwn just proved provider.id is one of this object's keys.
    return LABEL_BY_PROVIDER[provider.id as keyof typeof LABEL_BY_PROVIDER]();
  }
  return provider.name === null
    ? m.auth_oauth_sso()
    : m.auth_oauth_provider({ provider: provider.name });
};

interface AuthSignInOptionsProps {
  capabilities: AuthCapabilities | undefined;
  /** Raw query state. A failure over an answer already held is not this
   * block's business: the controls it describes are still the only way in some
   * accounts have, so they stay and the failure passes unremarked. */
  isError: boolean;
  isPasskeyPending: boolean;
  onPasskey: () => void;
  onProvider: (provider: string) => void;
  onRetry: () => void;
  pendingProvider: string | null;
}

/** Everything below the email-and-password form: the ways in that need no
 * password of their own. */
export const AuthSignInOptions = ({
  capabilities,
  isError,
  isPasskeyPending,
  onPasskey,
  onProvider,
  onRetry,
  pendingProvider,
}: AuthSignInOptionsProps) => {
  // `capabilities.passkey` is the deployment's answer; this is the reader's.
  // Either can be the no, and on a plain-`http` origin the second one is a
  // permanent no, so the button would never be able to do anything but
  // apologise.
  const isWebAuthnSupported = useWebAuthnSupport();

  // Only a failure with nothing to show: TanStack Query keeps `data` through a
  // failed refetch, so a stale-but-present answer renders its buttons instead.
  if (capabilities === undefined && isError) {
    return (
      <div className="mt-6 flex flex-col items-start gap-2">
        {/* The skeleton it replaces announced that these were loading, so the
            failure is said in the same voice rather than only drawn. */}
        <output className="text-muted-foreground text-sm">
          {m.auth_methods_load_error()}
        </output>
        {/* No pending state of its own: this block renders only with no answer
            at all, and there a retry does return the query to pending, which
            replaces it with the skeleton that names what is being fetched. */}
        <Button size="sm" type="button" variant="outline" onClick={onRetry}>
          {m.auth_retry()}
        </Button>
      </div>
    );
  }

  // Undecided is folded into the same wait as the server's own answer: a
  // button that appears and then vanishes is worse than one frame of skeleton.
  if (
    capabilities === undefined ||
    (capabilities.passkey && isWebAuthnSupported === null)
  ) {
    // Stands in for the options at their real height, so they do not shove the
    // form around when the server's answer lands.
    return (
      <div aria-busy="true" className="mt-6 flex flex-col gap-2">
        <output className="sr-only">{m.auth_loading_methods()}</output>
        <Skeleton aria-hidden="true" className="h-8 w-full rounded-md" />
      </div>
    );
  }

  const hasPasskey = capabilities.passkey && isWebAuthnSupported === true;

  // A reader with neither a usable passkey nor a provider gets no divider
  // either: an empty labelled rule reads as something that failed to load.
  if (!(hasPasskey || capabilities.oauth.length > 0)) {
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
            size="lg"
            type="button"
            variant="outline"
            onClick={onPasskey}
          >
            {isPasskeyPending && <Spinner data-icon="inline-start" />}
            {m.auth_passkey_submit()}
          </Button>
        )}

        {capabilities.oauth.map((provider) => (
          <Button
            key={provider.id}
            disabled={isRedirecting || isPasskeyPending}
            size="lg"
            type="button"
            variant="outline"
            onClick={() => onProvider(provider.id)}
          >
            {pendingProvider === provider.id && (
              <Spinner data-icon="inline-start" />
            )}
            {providerLabel(provider)}
          </Button>
        ))}
      </div>
    </div>
  );
};
