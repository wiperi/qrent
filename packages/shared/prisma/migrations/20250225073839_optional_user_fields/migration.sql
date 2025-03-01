-- AlterTable
ALTER TABLE `user` MODIFY `username` VARCHAR(20) NULL,
    MODIFY `password` VARCHAR(50) NULL,
    MODIFY `name` VARCHAR(50) NULL,
    MODIFY `gender` TINYINT UNSIGNED NULL,
    MODIFY `phone` CHAR(11) NULL;
