-- CreateEnum
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
    `id` varchar(36) NOT NULL,
    `checksum` varchar(64) NOT NULL,
    `finished_at` datetime(3) NULL,
    `migration_name` varchar(255) NOT NULL,
    `logs` text NULL,
    `rolled_back_at` datetime(3) NULL,
    `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` int UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateEnum
ALTER TABLE `_prisma_migrations` ENGINE=InnoDB;

-- PostType enum (MySQL uses VARCHAR for enums in Prisma)

-- CreateTable CommunityPost
CREATE TABLE `CommunityPost` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('achievement', 'milestone', 'question', 'tip', 'motivation') NOT NULL DEFAULT 'motivation',
    `content` TEXT NOT NULL,
    `tags` TEXT NULL,
    `likeCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityPost_userId_idx`(`userId`),
    INDEX `CommunityPost_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CommunityLike
CREATE TABLE `CommunityLike` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CommunityLike_post_user_key`(`postId`, `userId`),
    INDEX `CommunityLike_postId_idx`(`postId`),
    INDEX `CommunityLike_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CommunityChallenge
CREATE TABLE `CommunityChallenge` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityChallenge_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable ChallengeParticipant
CREATE TABLE `ChallengeParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `challengeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChallengeParticipant_challenge_user_key`(`challengeId`, `userId`),
    INDEX `ChallengeParticipant_challengeId_idx`(`challengeId`),
    INDEX `ChallengeParticipant_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityChallenge` ADD CONSTRAINT `CommunityChallenge_challengeId_fkey` FOREIGN KEY (`id`) REFERENCES `CommunityChallenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChallengeParticipant` ADD CONSTRAINT `ChallengeParticipant_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `CommunityChallenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChallengeParticipant` ADD CONSTRAINT `ChallengeParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
