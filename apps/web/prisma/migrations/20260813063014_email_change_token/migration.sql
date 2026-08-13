-- AlterTable
ALTER TABLE `EmailToken` ADD COLUMN `newEmail` VARCHAR(255) NULL,
    MODIFY `type` ENUM('verify', 'reset', 'invite', 'email_change') NOT NULL;
