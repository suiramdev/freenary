import { BrandAvatar } from "@freenary/ui/components/brand-avatar";
import { BrandPattern } from "@freenary/ui/components/brand-pattern";

import { m } from "@/paraglide/messages.js";

/**
 * The half of the sign-in screen that is not the form: the mark, set on a
 * field of itself. Nothing here is information — the mark carries the name,
 * and the tagline says what the product is for.
 */
export const AuthBrandPanel = () => (
  <div className="bg-muted relative hidden overflow-hidden lg:flex lg:flex-col">
    <BrandPattern className="opacity-20 dark:opacity-25" />
    {/* Clears a halo around the mark so it reads as the one, not one more. */}
    <div
      aria-hidden="true"
      className="from-muted absolute top-1/2 left-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-35% to-transparent"
    />
    {/* The wordmark sits on plain surface rather than across the field. */}
    <div
      aria-hidden="true"
      className="from-muted absolute inset-x-0 bottom-0 h-56 bg-linear-to-t to-transparent"
    />
    <div className="relative flex flex-1 items-center justify-center p-8">
      {/* Frozen: the mark's rest frame is the logo, and a loop that redraws
          the same frame would only spend the battery. */}
      <BrandAvatar frozenAt={0} size={176} state="logo" />
    </div>
    <div className="relative p-8">
      <h2 className="text-3xl font-bold tracking-tight">freenary</h2>
      <p className="text-muted-foreground mt-1 text-sm italic">
        {m.auth_tagline()}
      </p>
    </div>
  </div>
);
