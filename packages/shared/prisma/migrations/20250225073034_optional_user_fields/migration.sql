-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(20) NOT NULL,
    `password` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `gender` TINYINT UNSIGNED NOT NULL,
    `phone` CHAR(11) NOT NULL,
    `email` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `phone`(`phone`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
