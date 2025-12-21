-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(50) NOT NULL,
    `password` VARCHAR(200) NOT NULL,
    `name` VARCHAR(50) NOT NULL DEFAULT 'User',
    `gender` TINYINT UNSIGNED NULL,
    `phone` CHAR(11) NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_preferences` (
    `user_id` INTEGER UNSIGNED NOT NULL,
    `type` TINYINT UNSIGNED NOT NULL,

    PRIMARY KEY (`user_id`, `type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `user_sessions_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preferences` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `target_school` VARCHAR(100) NOT NULL,
    `min_price` INTEGER UNSIGNED NULL,
    `max_price` INTEGER UNSIGNED NULL,
    `min_bedrooms` TINYINT UNSIGNED NULL,
    `max_bedrooms` TINYINT UNSIGNED NULL,
    `min_bathrooms` TINYINT UNSIGNED NULL,
    `max_bathrooms` TINYINT UNSIGNED NULL,
    `regions` TEXT NULL,
    `property_type` TINYINT UNSIGNED NULL,
    `min_rating` DOUBLE NULL DEFAULT 13,
    `min_commute_time` INTEGER UNSIGNED NULL,
    `max_commute_time` INTEGER UNSIGNED NULL,
    `move_in_date` DATETIME(0) NULL,
    `user_id` INTEGER UNSIGNED NULL,

    INDEX `preferences_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `properties` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `price` INTEGER UNSIGNED NOT NULL,
    `address` VARCHAR(60) NOT NULL,
    `region_id` INTEGER UNSIGNED NOT NULL,
    `bedroom_count` TINYINT UNSIGNED NOT NULL,
    `bathroom_count` TINYINT UNSIGNED NOT NULL,
    `parking_count` TINYINT UNSIGNED NOT NULL,
    `property_type` TINYINT UNSIGNED NOT NULL,
    `house_id` INTEGER UNSIGNED NOT NULL,
    `available_date` DATETIME(0) NULL,
    `keywords` TEXT NOT NULL,
    `average_score` FLOAT NOT NULL,
    `description_en` VARCHAR(1024) NULL,
    `description_cn` VARCHAR(1024) NULL,
    `url` VARCHAR(255) NOT NULL,
    `published_at` DATETIME(0) NOT NULL,
    `image` TEXT NULL,
    `release_time` DATETIME(0) NULL,

    UNIQUE INDEX `house_id`(`house_id`),
    INDEX `properties_price_idx`(`price`),
    INDEX `properties_address_idx`(`address`),
    INDEX `properties_region_id_idx`(`region_id`),
    INDEX `properties_bedroom_count_idx`(`bedroom_count`),
    INDEX `properties_bathroom_count_idx`(`bathroom_count`),
    INDEX `properties_parking_count_idx`(`parking_count`),
    INDEX `properties_property_type_idx`(`property_type`),
    INDEX `properties_house_id_idx`(`house_id`),
    INDEX `properties_available_date_idx`(`available_date`),
    INDEX `properties_average_score_idx`(`average_score`),
    INDEX `properties_published_at_idx`(`published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `state` VARCHAR(20) NOT NULL,
    `postcode` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `regions_name_key`(`name`),
    INDEX `regions_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schools` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `schools_name_key`(`name`),
    INDEX `schools_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `property_school` (
    `property_id` INTEGER UNSIGNED NOT NULL,
    `school_id` INTEGER UNSIGNED NOT NULL,
    `commute_time` INTEGER UNSIGNED NULL,

    INDEX `property_school_property_id_idx`(`property_id`),
    INDEX `property_school_school_id_idx`(`school_id`),
    PRIMARY KEY (`property_id`, `school_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PropertyToUser` (
    `A` INTEGER UNSIGNED NOT NULL,
    `B` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `_PropertyToUser_AB_unique`(`A`, `B`),
    INDEX `_PropertyToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_RegionToSchool` (
    `A` INTEGER UNSIGNED NOT NULL,
    `B` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `_RegionToSchool_AB_unique`(`A`, `B`),
    INDEX `_RegionToSchool_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_preferences` ADD CONSTRAINT `email_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preferences` ADD CONSTRAINT `preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `properties` ADD CONSTRAINT `properties_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_school` ADD CONSTRAINT `property_school_property_id_fkey` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_school` ADD CONSTRAINT `property_school_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PropertyToUser` ADD CONSTRAINT `_PropertyToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PropertyToUser` ADD CONSTRAINT `_PropertyToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RegionToSchool` ADD CONSTRAINT `_RegionToSchool_A_fkey` FOREIGN KEY (`A`) REFERENCES `regions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RegionToSchool` ADD CONSTRAINT `_RegionToSchool_B_fkey` FOREIGN KEY (`B`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

