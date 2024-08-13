/*
  Warnings:

  - You are about to drop the column `color` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "color",
ADD COLUMN     "assembly_required" TEXT,
ADD COLUMN     "baterries" TEXT,
ADD COLUMN     "brand" TEXT NOT NULL DEFAULT 'Triumph Lights',
ADD COLUMN     "brightness" TEXT,
ADD COLUMN     "controller_type" TEXT,
ADD COLUMN     "design_style" TEXT,
ADD COLUMN     "embellishment" TEXT,
ADD COLUMN     "fixture_form" TEXT,
ADD COLUMN     "fixture_type" TEXT,
ADD COLUMN     "height" TEXT,
ADD COLUMN     "ideal_for" TEXT,
ADD COLUMN     "included_components" TEXT,
ADD COLUMN     "installation" TEXT,
ADD COLUMN     "item_weight" TEXT,
ADD COLUMN     "key_features" TEXT,
ADD COLUMN     "length" TEXT,
ADD COLUMN     "light_color" TEXT,
ADD COLUMN     "light_color_temperature" TEXT,
ADD COLUMN     "light_source" TEXT,
ADD COLUMN     "lighting_method" TEXT,
ADD COLUMN     "material" TEXT,
ADD COLUMN     "mounting_type" TEXT,
ADD COLUMN     "number_of_light_sources" TEXT,
ADD COLUMN     "power_rating" TEXT,
ADD COLUMN     "power_source" TEXT,
ADD COLUMN     "primary_material" TEXT,
ADD COLUMN     "quantity" TEXT,
ADD COLUMN     "shade_color" TEXT,
ADD COLUMN     "shade_material" TEXT,
ADD COLUMN     "shape" TEXT,
ADD COLUMN     "surge_protection" TEXT,
ADD COLUMN     "switch_type" TEXT,
ADD COLUMN     "swithc_mounting" TEXT,
ADD COLUMN     "voltage" TEXT,
ADD COLUMN     "width" TEXT;

-- CreateTable
CREATE TABLE "ProductColor" (
    "color_id" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("color_id")
);

-- AddForeignKey
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;
