-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `company` VARCHAR(160) NOT NULL,
    `contact` VARCHAR(255) NOT NULL,
    `source` VARCHAR(48) NOT NULL,
    `seats` INTEGER NOT NULL DEFAULT 1,
    `stage` VARCHAR(16) NOT NULL DEFAULT 'new',
    `nextStep` VARCHAR(200) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lead_stage_createdAt_idx`(`stage`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportCase` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `orgId` VARCHAR(64) NULL,
    `orgName` VARCHAR(255) NOT NULL DEFAULT '',
    `requesterEmail` VARCHAR(255) NOT NULL,
    `channel` VARCHAR(16) NOT NULL,
    `category` VARCHAR(24) NOT NULL,
    `priority` VARCHAR(16) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'open',
    `ownerEmail` VARCHAR(255) NULL,
    `slaDueAt` DATETIME(3) NOT NULL,
    `summary` VARCHAR(500) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupportCase_reference_key`(`reference`),
    INDEX `SupportCase_status_slaDueAt_idx`(`status`, `slaDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `recipientDomain` VARCHAR(255) NOT NULL,
    `state` VARCHAR(16) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `error` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MailDelivery_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobRun` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `queue` VARCHAR(32) NOT NULL DEFAULT 'manual',
    `state` VARCHAR(16) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `durationMs` INTEGER NULL,
    `error` VARCHAR(300) NULL,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `JobRun_name_scheduledAt_idx`(`name`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErrorGroup` (
    `id` VARCHAR(191) NOT NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `surface` VARCHAR(100) NOT NULL,
    `severity` VARCHAR(16) NOT NULL DEFAULT 'error',
    `state` VARCHAR(16) NOT NULL DEFAULT 'open',
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ErrorGroup_fingerprint_key`(`fingerprint`),
    INDEX `ErrorGroup_state_lastSeenAt_idx`(`state`, `lastSeenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErrorEvent` (
    `id` VARCHAR(191) NOT NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `orgId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ErrorEvent_fingerprint_createdAt_idx`(`fingerprint`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ErrorEvent` ADD CONSTRAINT `ErrorEvent_fingerprint_fkey` FOREIGN KEY (`fingerprint`) REFERENCES `ErrorGroup`(`fingerprint`) ON DELETE RESTRICT ON UPDATE CASCADE;
