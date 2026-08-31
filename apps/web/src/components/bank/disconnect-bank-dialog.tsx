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
}: DisconnectBankDialogProps) => (
  // Left open on confirm: a successful disconnect unmounts the row, and a
  // failed one keeps the dialog available to retry.
  <AlertDialog>
    <AlertDialogTrigger render={<Button variant="outline" />}>
      Disconnect
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Disconnect {institutionName}?</AlertDialogTitle>
        <AlertDialogDescription>
          {accountCount === 0
            ? "This asks your bank to revoke freenary's access. No account is linked, so no transaction is removed."
            : `This removes ${accountCount} linked account${accountCount === 1 ? "" : "s"} with the transactions imported from ${accountCount === 1 ? "it" : "them"}, and asks your bank to revoke freenary's access. Reconnect any time to import them again.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isDisconnecting}
          variant="destructive"
          onClick={onConfirm}
        >
          {isDisconnecting && <Spinner data-icon="inline-start" />}
          Disconnect bank
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
