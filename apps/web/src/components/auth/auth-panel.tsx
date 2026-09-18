import type { ReactNode } from "react";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export const AuthPanel = ({ children }: { children: ReactNode }) => (
  <div className="grid min-h-svh overflow-hidden lg:grid-cols-2">
    <div className="flex flex-col items-center p-6 sm:p-10">
      <div className="flex w-full max-w-sm justify-end gap-1">
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
      <div className="flex w-full max-w-sm flex-1 flex-col justify-center">
        {children}
      </div>
    </div>
    <AuthBrandPanel />
  </div>
);
