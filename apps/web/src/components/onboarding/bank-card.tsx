import { Button } from "@freenary/ui/components/button";
import { cn } from "@freenary/ui/lib/utils";
import { Bank, Check, SpinnerGapIcon } from "@phosphor-icons/react";

interface BankCardProps {
  bic: string | null;
  connected: boolean;
  connecting?: boolean;
  logo: string | null;
  name: string;
  onConnect: () => void;
}

export const BankCard = ({
  bic,
  connected,
  connecting,
  logo,
  name,
  onConnect,
}: BankCardProps) => (
  <div
    className={cn(
      "flex items-center gap-3 border px-4 py-3 transition-colors",
      connected
        ? "border-primary bg-secondary text-foreground"
        : "border-border bg-card"
    )}
  >
    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden">
      {logo ? (
        <img alt="" className="size-8 object-contain" src={logo} />
      ) : (
        <Bank className="text-muted-foreground size-5" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{name}</p>
      {bic && <p className="text-muted-foreground text-xs">{bic}</p>}
    </div>
    {connected ? (
      <span className="text-primary flex items-center gap-1 text-xs font-medium">
        <Check className="size-3.5" weight="bold" />
        Connected
      </span>
    ) : (
      <Button
        disabled={connecting}
        onClick={onConnect}
        size="sm"
        type="button"
        variant="secondary"
      >
        {connecting ? (
          <SpinnerGapIcon className="size-3.5 animate-spin" />
        ) : (
          "Connect"
        )}
      </Button>
    )}
  </div>
);
