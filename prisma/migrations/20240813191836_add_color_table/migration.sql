/*
  Warnings:

  - The primary key for the `ProductColor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `color_name` on the `ProductColor` table. All the data in the column will be lost.
  - You are about to drop the column `hex` on the `ProductColor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductColor" DROP CONSTRAINT "ProductColor_pkey",
DROP COLUMN "color_name",
DROP COLUMN "hex",
ADD CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("product_id", "color_id");

-- CreateTable
CREATE TABLE "Color" (
    "color_id" TEXT NOT NULL,
    "color_name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("color_id")
);

-- AddForeignKey
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "Color"("color_id") ON DELETE RESTRICT ON UPDATE CASCADE;
