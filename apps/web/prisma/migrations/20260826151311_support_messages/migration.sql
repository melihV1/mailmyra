-- CreateTable
CREATE TABLE `SupportMessage` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `authorType` VARCHAR(16) NOT NULL,
    `authorEmail` VARCHAR(255) NOT NULL,
    `body` VARCHAR(2000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportMessage_caseId_createdAt_idx`(`caseId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `SupportCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
