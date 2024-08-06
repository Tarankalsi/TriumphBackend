/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `U_OTP` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "U_OTP_user_id_key" ON "U_OTP"("user_id");
