"use client";

import { useState } from "react";

export type DeleteAccountDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmHint: string;
  confirmLabel: string;
  cancelLabel: string;
  exportLabel: string;
  exportHref: string;
  errorMessage?: string | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
};

// The word the user must type to confirm. It is the same in every
// locale, so the check in the Settings page can compare it directly.
const CONFIRM_WORD = "DELETE";

// Confirmation dialog for issue #430, shown from the bottom of
// Settings. The Settings page re-authenticates the user (password,
// OTP or 2FA, whichever they use) before calling `onDelete`, and
// sends the user to the sign-in page after deletion succeeds.
export function DeleteAccountDialog({
  open,
  title,
  description,
  confirmHint,
  confirmLabel,
  cancelLabel,
  exportLabel,
  exportHref,
  errorMessage,
  onClose,
  onDelete,
}: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!open) {
    return null;
  }

  const confirmed = confirmation.trim() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!confirmed || deleting) {
      return;
    }
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
      <p>
        <a href={exportHref}>{exportLabel}</a>
      </p>
      <label>
        {confirmHint}
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
        />
      </label>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <button type="button" onClick={onClose} disabled={deleting}>
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={!confirmed || deleting}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
