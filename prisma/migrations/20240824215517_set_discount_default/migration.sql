/*
  Warnings:

  - Made the column `discount_percent` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "discount_percent" SET NOT NULL,
ALTER COLUMN "discount_percent" SET DEFAULT 0;
