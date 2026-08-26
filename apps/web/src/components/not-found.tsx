import { Button } from "@freenary/ui/components/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { ShaderBackground } from "@/components/shader-background";

export const NotFound = () => (
  <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
    <div className="pointer-events-none fixed inset-0" aria-hidden="true">
      <ShaderBackground />
    </div>

    <div className="pointer-events-none absolute inset-0 bg-radial from-background/90 via-background/50 to-transparent" />

    <div className="relative z-10 flex max-w-md flex-col items-center gap-5">
      <p
        aria-hidden="true"
        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-[7rem] font-bold leading-none text-primary sm:text-[9rem]"
      >
        404
      </p>
      <h1 className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-2xl font-bold text-foreground delay-75">
        This page filed for bankruptcy
      </h1>
      <p className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-muted-foreground delay-100">
        It listed zero assets, zero content, and frankly, zero chance of coming
        back.
      </p>
      <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both mt-2 delay-150">
        <Button render={<Link to="/" />} size="lg">
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to home
        </Button>
      </div>
    </div>
  </main>
);
