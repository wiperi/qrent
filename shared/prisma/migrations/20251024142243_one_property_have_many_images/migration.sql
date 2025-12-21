-- CreateTable
CREATE TABLE `property_images` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `property_id` INTEGER UNSIGNED NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `display_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `property_images_property_id_display_order_idx`(`property_id`, `display_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `property_images` ADD CONSTRAINT `property_images_property_id_fkey` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
