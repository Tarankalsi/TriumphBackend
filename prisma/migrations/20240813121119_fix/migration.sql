/*
  Warnings:

  - You are about to drop the column `baterries` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "baterries",
ADD COLUMN     "batteries" TEXT;
