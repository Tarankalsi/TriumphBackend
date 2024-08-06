/*
  Warnings:

  - You are about to drop the column `url_public_id` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `url_public_id` on the `ReviewImage` table. All the data in the column will be lost.
  - Added the required column `key` to the `ProductImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `ReviewImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductImage" DROP COLUMN "url_public_id",
ADD COLUMN     "key" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ReviewImage" DROP COLUMN "url_public_id",
ADD COLUMN     "key" TEXT NOT NULL;
