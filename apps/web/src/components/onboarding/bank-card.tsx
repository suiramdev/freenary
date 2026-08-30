import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
import { Spinner } from "@freenary/ui/components/spinner";
import { BankIcon, CheckIcon } from "@phosphor-icons/react";

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
  <Item
    render={<li />}
    className={connected ? "border-primary bg-secondary" : undefined}
    size="sm"
    variant="outline"
  >
    {/* Bank logos are full marks, not avatars — cropping them loses the name. */}
    <ItemMedia
      className="text-muted-foreground [&_img]:object-contain [&_svg]:size-5"
      variant="image"
    >
      {logo ? <img alt="" src={logo} /> : <BankIcon />}
    </ItemMedia>
    <ItemContent className="min-w-0">
      <ItemTitle className="block w-full truncate">{name}</ItemTitle>
      {bic ? <ItemDescription>{bic}</ItemDescription> : null}
    </ItemContent>
    <ItemActions>
      {connected ? (
        <Badge variant="secondary">
          <CheckIcon data-icon="inline-start" weight="bold" />
          Connected
        </Badge>
      ) : (
        <Button
          disabled={connecting}
          onClick={onConnect}
          type="button"
          variant="secondary"
        >
          {connecting && <Spinner data-icon="inline-start" />}
          Connect
        </Button>
      )}
    </ItemActions>
  </Item>
);
