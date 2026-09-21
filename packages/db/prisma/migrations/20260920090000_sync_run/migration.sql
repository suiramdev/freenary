-- The bank synchronisation a user has in flight, so a second request reads its
-- progress instead of starting a competing run.
CREATE TYPE "SyncPhase" AS ENUM ('IMPORTING', 'CATEGORISING', 'FINISHED');

CREATE TABLE "sync_run" (
  "userId" TEXT NOT NULL,
  "phase" "SyncPhase" NOT NULL,
  "accountsTotal" INTEGER NOT NULL DEFAULT 0,
  "accountsDone" INTEGER NOT NULL DEFAULT 0,
  "transactionsImported" INTEGER NOT NULL DEFAULT 0,
  "categorisedTotal" INTEGER NOT NULL DEFAULT 0,
  "categorised" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "sync_run_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "sync_run" ADD CONSTRAINT "sync_run_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
