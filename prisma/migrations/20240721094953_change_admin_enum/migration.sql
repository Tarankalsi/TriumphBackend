/*
  Warnings:

  - The values [SUPERADMIN,ADMIN,MODERATOR] on the enum `AdminRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminRole_new" AS ENUM ('admin', 'moderator');
ALTER TABLE "Admin" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Admin" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");
ALTER TYPE "AdminRole" RENAME TO "AdminRole_old";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";
DROP TYPE "AdminRole_old";
ALTER TABLE "Admin" ALTER COLUMN "role" SET DEFAULT 'moderator';
COMMIT;

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "role" SET DEFAULT 'moderator';
