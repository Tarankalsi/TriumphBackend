/*
  Warnings:

  - The `shiprocket_shipment_id` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `shiprocket_order_id` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shiprocket_shipment_id",
ADD COLUMN     "shiprocket_shipment_id" INTEGER,
DROP COLUMN "shiprocket_order_id",
ADD COLUMN     "shiprocket_order_id" INTEGER;
