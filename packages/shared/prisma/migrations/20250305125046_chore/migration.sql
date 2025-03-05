/*
  Warnings:

  - You are about to alter the column `publishedAt` on the `property` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to drop the `userpreference` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `userpreference` DROP FOREIGN KEY `UserPreference_userId_fkey`;

-- AlterTable
ALTER TABLE `property` MODIFY `publishedAt` DATETIME NULL;

-- DropTable
DROP TABLE `userpreference`;

-- CreateTable
CREATE TABLE `user_preference` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `targetSchool` VARCHAR(100) NULL,
    `minPrice` INTEGER UNSIGNED NULL,
    `maxPrice` INTEGER UNSIGNED NULL,
    `minBedrooms` TINYINT UNSIGNED NULL,
    `maxBedrooms` TINYINT UNSIGNED NULL,
    `minBathrooms` TINYINT UNSIGNED NULL,
    `maxBathrooms` TINYINT UNSIGNED NULL,
    `regions` TEXT NULL,
    `propertyType` TINYINT UNSIGNED NULL,
    `minRating` DOUBLE NULL DEFAULT 13,
    `minCommuteTime` INTEGER UNSIGNED NULL,
    `maxCommuteTime` INTEGER UNSIGNED NULL,
    `moveInDate` DATETIME(3) NULL,
    `userId` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `user_preference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_preference` ADD CONSTRAINT `user_preference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
