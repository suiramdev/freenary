interface OnboardingStepHeaderProps {
  description: string;
  title: string;
}

export const OnboardingStepHeader = ({
  description,
  title,
}: OnboardingStepHeaderProps) => (
  <div className="flex flex-col gap-1.5">
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);
