/*
  Warnings:

  - You are about to alter the column `publishedAt` on the `property` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- DropForeignKey
ALTER TABLE `user_preference` DROP FOREIGN KEY `user_preference_userId_fkey`;

-- AlterTable
ALTER TABLE `property` MODIFY `publishedAt` DATETIME NULL;
