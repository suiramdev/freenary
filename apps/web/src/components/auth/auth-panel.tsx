import type { ReactNode } from "react";

import { ShaderPanel } from "./shader-panel";

export const AuthPanel = ({ children }: { children: ReactNode }) => (
  <div className="grid min-h-svh overflow-hidden lg:grid-cols-2">
    <div className="flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
    <ShaderPanel />
  </div>
);
