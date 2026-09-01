import { Skeleton } from "@freenary/ui/components/skeleton";

import { BankListSkeleton } from "@/components/bank/bank-list-skeleton";
import { m } from "@/paraglide/messages.js";

export const OnboardingWizardSkeleton = () => (
  <div aria-busy="true">
    <output className="sr-only">{m.onboarding_loading()}</output>
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-px w-8 sm:w-12" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-72" />
      </div>

      <Skeleton className="h-9 w-full rounded-md" />

      <BankListSkeleton rows={4} />
    </div>
  </div>
);
