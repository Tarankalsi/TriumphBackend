/*
  Warnings:

  - Added the required column `discount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_charges` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sub_total` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_amount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `discount` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "orderStatus" AS ENUM ('processing', 'shipped', 'delivered', 'cancelled', 'returned');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "shipping_charges" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sub_total" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tax_amount" DOUBLE PRECISION NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "orderStatus" NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL;
