-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shiprocket_shipment_id" TEXT,
ADD COLUMN     "shiprocket_status" TEXT,
ADD COLUMN     "shiprocket_tracking_url" TEXT;
