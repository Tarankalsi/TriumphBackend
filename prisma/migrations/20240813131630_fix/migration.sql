/*
  Warnings:

  - You are about to drop the column `color` on the `ProductColor` table. All the data in the column will be lost.
  - Added the required column `color_name` to the `ProductColor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductColor" DROP COLUMN "color",
ADD COLUMN     "color_name" TEXT NOT NULL;
