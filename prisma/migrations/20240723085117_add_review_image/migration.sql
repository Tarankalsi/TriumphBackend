-- CreateTable
CREATE TABLE "ReviewImage" (
    "image_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url_public_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("image_id")
);

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("review_id") ON DELETE RESTRICT ON UPDATE CASCADE;
