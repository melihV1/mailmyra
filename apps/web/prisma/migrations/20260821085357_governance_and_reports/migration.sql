-- CreateTable
CREATE TABLE `ApprovalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `domain` VARCHAR(32) NOT NULL,
    `riskLevel` VARCHAR(16) NOT NULL,
    `policyVersion` VARCHAR(32) NOT NULL,
    `orgId` VARCHAR(64) NULL,
    `orgName` VARCHAR(255) NULL,
    `targetType` VARCHAR(24) NULL,
    `targetId` VARCHAR(64) NULL,
    `requestedById` VARCHAR(191) NULL,
    `requestedByEmail` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `requiredApprovals` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
    `decidedAt` DATETIME(3) NULL,
    `decidedByEmail` VARCHAR(255) NULL,
    `decisionReason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApprovalRequest_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalDecision` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `decision` VARCHAR(16) NOT NULL,
    `decidedById` VARCHAR(191) NULL,
    `decidedByEmail` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ApprovalDecision_requestId_decidedByEmail_key`(`requestId`, `decidedByEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalEvent` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `actorEmail` VARCHAR(255) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApprovalEvent_requestId_createdAt_idx`(`requestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KvkkRequest` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `subjectEmail` VARCHAR(255) NOT NULL,
    `orgId` VARCHAR(64) NULL,
    `orgName` VARCHAR(255) NOT NULL DEFAULT '',
    `type` VARCHAR(16) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'intake',
    `receivedAt` DATETIME(3) NOT NULL,
    `receivedVia` VARCHAR(32) NULL,
    `statutoryDueAt` DATETIME(3) NOT NULL,
    `identityVerifiedAt` DATETIME(3) NULL,
    `identityMethod` VARCHAR(48) NULL,
    `ownerId` VARCHAR(191) NULL,
    `ownerEmail` VARCHAR(255) NULL,
    `respondedAt` DATETIME(3) NULL,
    `responseSummary` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `KvkkRequest_reference_key`(`reference`),
    INDEX `KvkkRequest_status_statutoryDueAt_idx`(`status`, `statutoryDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KvkkEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `location` VARCHAR(500) NOT NULL,
    `addedByEmail` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KvkkEvidence_requestId_createdAt_idx`(`requestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KvkkEvent` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `actorEmail` VARCHAR(255) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KvkkEvent_requestId_createdAt_idx`(`requestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(48) NOT NULL,
    `cadence` VARCHAR(16) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul',
    `format` VARCHAR(16) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'active',
    `nextRunAt` DATETIME(3) NULL,
    `ownerEmail` VARCHAR(255) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdByEmail` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReportSchedule_status_nextRunAt_idx`(`status`, `nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportRecipient` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `ReportRecipient_scheduleId_email_key`(`scheduleId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportExecution` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NULL,
    `status` VARCHAR(16) NOT NULL,
    `error` VARCHAR(500) NULL,
    `rowCount` INTEGER NULL,

    INDEX `ReportExecution_scheduleId_startedAt_idx`(`scheduleId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `executionId` VARCHAR(191) NOT NULL,
    `recipientEmail` VARCHAR(255) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `detail` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReportDelivery_executionId_idx`(`executionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalDecision` ADD CONSTRAINT `ApprovalDecision_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ApprovalRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalDecision` ADD CONSTRAINT `ApprovalDecision_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalEvent` ADD CONSTRAINT `ApprovalEvent_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ApprovalRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KvkkRequest` ADD CONSTRAINT `KvkkRequest_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KvkkEvidence` ADD CONSTRAINT `KvkkEvidence_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `KvkkRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KvkkEvent` ADD CONSTRAINT `KvkkEvent_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `KvkkRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSchedule` ADD CONSTRAINT `ReportSchedule_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportRecipient` ADD CONSTRAINT `ReportRecipient_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `ReportSchedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportExecution` ADD CONSTRAINT `ReportExecution_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `ReportSchedule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportDelivery` ADD CONSTRAINT `ReportDelivery_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `ReportExecution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
