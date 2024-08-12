/*
  Warnings:

  - You are about to drop the column `availablity` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "availablity",
ADD COLUMN     "availability" INTEGER NOT NULL DEFAULT 0;
