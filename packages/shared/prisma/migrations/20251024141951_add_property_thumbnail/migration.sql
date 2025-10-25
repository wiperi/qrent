/*
  Warnings:

  - You are about to drop the column `image` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `release_time` on the `properties` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `properties` DROP COLUMN `image`,
    DROP COLUMN `release_time`,
    ADD COLUMN `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `thumbnail_url` VARCHAR(500) NOT NULL DEFAULT '';
