-- AlterTable
ALTER TABLE "users" ADD COLUMN "special_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "special_contribution" DOUBLE PRECISION DEFAULT 0;

-- CreateEnum
CREATE TYPE "WithdrawalSource" AS ENUM ('MONTHLY_SAVINGS', 'SPECIAL_SAVINGS');

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN "source" "WithdrawalSource" NOT NULL DEFAULT 'MONTHLY_SAVINGS';
