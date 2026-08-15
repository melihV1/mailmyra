-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(32) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL,
    `dueAt` DATETIME(3) NULL,
    `seats` INTEGER NOT NULL,
    `unitCents` INTEGER NOT NULL DEFAULT 100,
    `amountCents` INTEGER NOT NULL,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(16) NOT NULL DEFAULT 'due',
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invoice_number_key`(`number`),
    INDEX `Invoice_orgId_issuedAt_idx`(`orgId`, `issuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
