/*
  Warnings:

  - You are about to drop the column `username` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `username` ON `user`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `username`,
    MODIFY `password` VARCHAR(200) NULL;

-- CreateTable
CREATE TABLE `Property` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `pricePerWeek` DOUBLE NULL,
    `addressLine1` VARCHAR(60) NULL,
    `addressLine2` VARCHAR(27) NULL,
    `bedroomCount` DOUBLE NULL,
    `bathroomCount` DOUBLE NULL,
    `parkingCount` DOUBLE NULL,
    `propertyType` TINYINT UNSIGNED NULL,
    `houseId` INTEGER NULL,
    `commuteTime` DOUBLE NULL,
    `availableDate` VARCHAR(50) NULL,
    `keywords` TEXT NULL,
    `averageScore` DOUBLE NULL,
    `url` VARCHAR(255) NULL,
    `publishedAt` DATETIME NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPreference` (
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

    UNIQUE INDEX `UserPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PropertyToUser` (
    `A` INTEGER UNSIGNED NOT NULL,
    `B` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `_PropertyToUser_AB_unique`(`A`, `B`),
    INDEX `_PropertyToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserPreference` ADD CONSTRAINT `UserPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PropertyToUser` ADD CONSTRAINT `_PropertyToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PropertyToUser` ADD CONSTRAINT `_PropertyToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
