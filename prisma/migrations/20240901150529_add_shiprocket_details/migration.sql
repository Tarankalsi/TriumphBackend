/*
  Warnings:

  - Made the column `height` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `length` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `width` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "height" SET NOT NULL,
ALTER COLUMN "length" SET NOT NULL,
ALTER COLUMN "width" SET NOT NULL;
