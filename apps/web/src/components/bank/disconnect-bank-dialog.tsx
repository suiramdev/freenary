import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@freenary/ui/components/alert-dialog";
import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";

import { m } from "@/paraglide/messages.js";

interface DisconnectBankDialogProps {
  accountCount: number;
  institutionName: string;
  isDisconnecting: boolean;
  onConfirm: () => void;
}

export const DisconnectBankDialog = ({
  accountCount,
  institutionName,
  isDisconnecting,
  onConfirm,
}: DisconnectBankDialogProps) => {
  const description =
    accountCount > 0
      ? m.bank_disconnect_confirm_description({ count: accountCount })
      : m.bank_disconnect_confirm_description_none();

  return (
    // Left open on confirm: a successful disconnect unmounts the row, and a
    // failed one keeps the dialog available to retry.
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            aria-label={m.bank_disconnect_aria_label({
              institution: institutionName,
            })}
            variant="outline"
          />
        }
      >
        {m.bank_disconnect()}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.bank_disconnect_confirm_title({ institution: institutionName })}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.bank_disconnect_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDisconnecting}
            variant="destructive"
            onClick={onConfirm}
          >
            {isDisconnecting && <Spinner data-icon="inline-start" />}
            {m.bank_disconnect_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
