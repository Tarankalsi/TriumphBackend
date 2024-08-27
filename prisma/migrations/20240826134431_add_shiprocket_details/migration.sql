/*
  Warnings:

  - A unique constraint covering the columns `[shiprocket_order_id]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_shiprocket_order_id_key" ON "Order"("shiprocket_order_id");
