/*
  Warnings:

  - You are about to drop the `OTP` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OTP" DROP CONSTRAINT "OTP_admin_id_fkey";

-- DropTable
DROP TABLE "OTP";

-- CreateTable
CREATE TABLE "A_OTP" (
    "admin_id" TEXT NOT NULL,

    CONSTRAINT "A_OTP_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "U_OTP" (
    "user_id" TEXT NOT NULL,

    CONSTRAINT "U_OTP_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "A_OTP" ADD CONSTRAINT "A_OTP_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "U_OTP" ADD CONSTRAINT "U_OTP_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
