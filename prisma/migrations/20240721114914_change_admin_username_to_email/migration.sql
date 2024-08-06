/*
  Warnings:

  - You are about to drop the column `username` on the `Admin` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Admin_username_key";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "username",
ADD COLUMN     "email" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "OTP" (
    "admin_id" TEXT NOT NULL,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("admin_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
