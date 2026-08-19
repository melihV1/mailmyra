-- AlterTable
ALTER TABLE `StaffAccess` ADD COLUMN `ip` VARCHAR(45) NULL,
    ADD COLUMN `userAgent` VARCHAR(512) NULL;

-- CreateTable
CREATE TABLE `AdminAction` (
    `id` VARCHAR(191) NOT NULL,
    `staffUserId` VARCHAR(191) NULL,
    `staffEmail` VARCHAR(255) NOT NULL,
    `orgId` VARCHAR(64) NOT NULL,
    `orgName` VARCHAR(255) NOT NULL,
    `action` VARCHAR(48) NOT NULL,
    `targetId` VARCHAR(64) NULL,
    `before` JSON NOT NULL,
    `after` JSON NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAction_orgId_createdAt_idx`(`orgId`, `createdAt`),
    INDEX `AdminAction_staffUserId_createdAt_idx`(`staffUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminAction` ADD CONSTRAINT `AdminAction_staffUserId_fkey` FOREIGN KEY (`staffUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
