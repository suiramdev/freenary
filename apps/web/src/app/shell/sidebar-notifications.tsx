import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

import { NotificationCenter } from "@/features/notifications";
import type { NotificationEntry } from "@/features/notifications";
import { TransactionsToCheckDrawer } from "@/features/transaction-details";

export const SidebarNotifications = () => {
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [reviewedId, setReviewedId] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const handleOpen = useCallback((notification: NotificationEntry) => {
    if (notification.type === "transactions_to_check") {
      setReviewedId(notification.id);
      setIsReviewOpen(true);
    }
    if (notification.type === "bank_connection_needs_reconnect") {
      void navigate({ search: { section: "bank-accounts" }, to: "/settings" });
    }
  }, [navigate]);

  return (
    <>
      <NotificationCenter onOpen={handleOpen} triggerRef={triggerRef} />
      <TransactionsToCheckDrawer
        finalFocus={triggerRef}
        notificationId={reviewedId}
        onOpenChange={setIsReviewOpen}
        open={isReviewOpen}
      />
    </>
  );
};
