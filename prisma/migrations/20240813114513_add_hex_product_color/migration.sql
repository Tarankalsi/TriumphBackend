/*
  Warnings:

  - Added the required column `hex` to the `ProductColor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductColor" ADD COLUMN     "hex" TEXT NOT NULL;
