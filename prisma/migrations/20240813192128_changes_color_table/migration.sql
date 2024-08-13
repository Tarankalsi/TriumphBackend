/*
  Warnings:

  - A unique constraint covering the columns `[hex]` on the table `Color` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Color_hex_key" ON "Color"("hex");
