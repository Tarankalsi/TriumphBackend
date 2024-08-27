/*
  Warnings:

  - Made the column `item_weight` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "item_weight" SET NOT NULL;
