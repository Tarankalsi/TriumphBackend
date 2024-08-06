/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `code` to the `U_OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `U_OTP` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "U_OTP" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password";
