import type { ReactNode } from "react";

import { AuthShowcasePanel } from "@/components/auth/auth-showcase-panel";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export const AuthPanel = ({ children }: { children: ReactNode }) => (
  <div className="grid min-h-svh overflow-hidden lg:grid-cols-2">
    {/* Both rows share the form's width so the switchers line up with the
        form's right edge instead of drifting to the column's. */}
    <div className="flex flex-col items-center p-6 sm:p-10">
      {/* Language and appearance before sign-in: someone who cannot read the
          form, or cannot comfortably look at it, cannot be asked to sign in
          first to change it. */}
      <div className="flex w-full max-w-sm justify-end gap-1">
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
      <div className="flex w-full max-w-sm flex-1 flex-col justify-center">
        {children}
      </div>
    </div>
    <AuthShowcasePanel />
  </div>
);
