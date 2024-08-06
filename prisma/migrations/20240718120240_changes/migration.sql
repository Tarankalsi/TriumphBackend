/*
  Warnings:

  - You are about to drop the column `image_url` on the `Category` table. All the data in the column will be lost.
  - Added the required column `url_public_id` to the `ProductImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "image_url";

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "url_public_id" TEXT NOT NULL;
