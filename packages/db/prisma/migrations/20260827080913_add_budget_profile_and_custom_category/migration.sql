-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "BudgetLineKind" AS ENUM ('REVENUE', 'INVESTMENT', 'OUTGOING');

-- CreateTable
CREATE TABLE "custom_category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" CITEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "parentSlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_line" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BudgetLineKind" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "categorySlug" TEXT,
    "categoryId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_category_userId_parentSlug_sortOrder_idx" ON "custom_category"("userId", "parentSlug", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "custom_category_userId_label_key" ON "custom_category"("userId", "label");

-- CreateIndex
CREATE INDEX "budget_line_userId_kind_sortOrder_idx" ON "budget_line"("userId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "budget_line_categoryId_idx" ON "budget_line"("categoryId");

-- AddForeignKey
ALTER TABLE "custom_category" ADD CONSTRAINT "custom_category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_line" ADD CONSTRAINT "budget_line_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_line" ADD CONSTRAINT "budget_line_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "custom_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
