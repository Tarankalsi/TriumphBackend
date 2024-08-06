/*
  Warnings:

  - Added the required column `code` to the `A_OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `A_OTP` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "A_OTP" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL;
