/*
  Warnings:

  - You are about to drop the column `discount_price` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "discount_price",
ADD COLUMN     "discount_percent" DOUBLE PRECISION;
