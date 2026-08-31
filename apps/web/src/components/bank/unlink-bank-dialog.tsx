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
import { LinkBreakIcon } from "@phosphor-icons/react";

interface UnlinkBankDialogProps {
  accountCount: number;
  institutionName: string;
  isUnlinking: boolean;
  onConfirm: () => void;
}

export const UnlinkBankDialog = ({
  accountCount,
  institutionName,
  isUnlinking,
  onConfirm,
}: UnlinkBankDialogProps) => (
  // Left open on confirm: a successful unlink unmounts the row, and a failed
  // one keeps the dialog available to retry.
  <AlertDialog>
    <AlertDialogTrigger render={<Button variant="ghost" />}>
      <LinkBreakIcon />
      <span className="sr-only">Unlink {institutionName}</span>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Unlink {institutionName}?</AlertDialogTitle>
        <AlertDialogDescription>
          {accountCount === 0
            ? "This asks your bank to revoke freenary's access. No account is linked, so no transaction is removed."
            : `This removes ${accountCount} linked account${accountCount === 1 ? "" : "s"} with the transactions imported from ${accountCount === 1 ? "it" : "them"}, and asks your bank to revoke freenary's access. Reconnect any time to import them again.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isUnlinking}
          variant="destructive"
          onClick={onConfirm}
        >
          {isUnlinking && <Spinner data-icon="inline-start" />}
          Unlink bank
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
