-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shiprocket_awb_code" TEXT,
ADD COLUMN     "shiprocket_courier_partner_id" TEXT,
ADD COLUMN     "shiprocket_estimated_delivery" TIMESTAMP(3);
