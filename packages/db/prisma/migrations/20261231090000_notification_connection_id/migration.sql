ALTER TABLE "notification" ADD COLUMN "connectionId" TEXT;

CREATE INDEX "notification_connectionId_idx" ON "notification"("connectionId");
