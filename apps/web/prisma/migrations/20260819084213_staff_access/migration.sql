-- AlterTable
ALTER TABLE `User` ADD COLUMN `isStaff` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `StaffAccess` (
    `id` VARCHAR(191) NOT NULL,
    `staffUserId` VARCHAR(191) NULL,
    `staffEmail` VARCHAR(255) NOT NULL,
    `orgId` VARCHAR(64) NOT NULL,
    `orgName` VARCHAR(255) NOT NULL,
    `scope` VARCHAR(24) NOT NULL,
    `targetId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffAccess_orgId_createdAt_idx`(`orgId`, `createdAt`),
    INDEX `StaffAccess_staffUserId_createdAt_idx`(`staffUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StaffAccess` ADD CONSTRAINT `StaffAccess_staffUserId_fkey` FOREIGN KEY (`staffUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
