-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(24) NULL,
    ADD COLUMN `paymentReference` VARCHAR(128) NULL;
