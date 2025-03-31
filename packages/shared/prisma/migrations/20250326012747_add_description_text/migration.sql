/*
  Warnings:

  - You are about to alter the column `publishedAt` on the `Property` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `Property` ADD COLUMN `description` TEXT NULL,
    MODIFY `publishedAt` DATETIME NULL;
