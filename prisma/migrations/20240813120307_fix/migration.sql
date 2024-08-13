/*
  Warnings:

  - You are about to drop the column `swithc_mounting` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "swithc_mounting",
ADD COLUMN     "switch_mounting" TEXT;
