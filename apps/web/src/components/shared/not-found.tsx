import { Button } from "@freenary/ui/components/button";
import { RiArrowLeftLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";

export const NotFound = () => (
  <main className="bg-background flex min-h-svh flex-col items-center justify-center px-6 text-center">
    <div className="flex max-w-md flex-col items-center gap-5">
      <p
        aria-hidden="true"
        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-primary text-[7rem] leading-none font-bold sm:text-[9rem]"
      >
        404
      </p>
      <h1 className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-foreground text-2xl font-bold delay-75">
        {m.shell_not_found_title()}
      </h1>
      <p className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-muted-foreground delay-100">
        {m.shell_not_found_description()}
      </p>
      <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both mt-2 delay-150">
        <Button render={<Link to="/" />}>
          <RiArrowLeftLine data-icon="inline-start" aria-hidden="true" />
          {m.shell_not_found_back_home()}
        </Button>
      </div>
    </div>
  </main>
);
