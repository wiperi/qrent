-- AlterTable
ALTER TABLE `properties` ADD COLUMN `available_area` ENUM('entire_home', 'primary_bedroom', 'secondary_bedroom', 'shared_bedroom', 'living_room', 'study_room') NOT NULL DEFAULT 'entire_home';
