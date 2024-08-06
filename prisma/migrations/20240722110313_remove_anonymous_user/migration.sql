/*
  Warnings:

  - You are about to drop the column `session_id` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the `AnonymousUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_session_id_fkey";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "session_id";

-- DropTable
DROP TABLE "AnonymousUser";
