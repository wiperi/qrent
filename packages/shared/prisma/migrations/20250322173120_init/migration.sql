-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `password` VARCHAR(200) NULL,
    `name` VARCHAR(50) NULL,
    `gender` TINYINT UNSIGNED NULL,
    `phone` CHAR(11) NULL,
    `email` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `phone`(`phone`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `_PropertyToUser` (
    `A` INTEGER UNSIGNED NOT NULL,
    `B` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `_PropertyToUser_AB_unique`(`A`, `B`),
    INDEX `_PropertyToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_PropertyToUser` ADD CONSTRAINT `_PropertyToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PropertyToUser` ADD CONSTRAINT `_PropertyToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
