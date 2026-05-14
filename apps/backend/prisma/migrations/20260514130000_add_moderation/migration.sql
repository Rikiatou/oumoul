-- AddColumn reportCount + isHidden to CommunityPost
ALTER TABLE `CommunityPost`
  ADD COLUMN `reportCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `CommunityPost_isHidden_idx` ON `CommunityPost`(`isHidden`);

-- CreateEnum ReportReason
-- (MySQL stores enums inline on the column)

-- CreateTable PostReport
CREATE TABLE `PostReport` (
  `id`         VARCHAR(191) NOT NULL,
  `postId`     VARCHAR(191) NOT NULL,
  `reporterId` VARCHAR(191) NOT NULL,
  `reason`     ENUM('INAPPROPRIATE','SPAM','HATE_SPEECH','MISINFORMATION','OTHER') NOT NULL DEFAULT 'OTHER',
  `details`    TEXT NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PostReport_post_reporter_key`(`postId`, `reporterId`),
  INDEX `PostReport_postId_idx`(`postId`),
  INDEX `PostReport_reporterId_idx`(`reporterId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey PostReport → CommunityPost
ALTER TABLE `PostReport`
  ADD CONSTRAINT `PostReport_postId_fkey`
  FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey PostReport → User
ALTER TABLE `PostReport`
  ADD CONSTRAINT `PostReport_reporterId_fkey`
  FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable UserBlock
CREATE TABLE `UserBlock` (
  `id`        VARCHAR(191) NOT NULL,
  `blockerId` VARCHAR(191) NOT NULL,
  `blockedId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `UserBlock_blocker_blocked_key`(`blockerId`, `blockedId`),
  INDEX `UserBlock_blockerId_idx`(`blockerId`),
  INDEX `UserBlock_blockedId_idx`(`blockedId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey UserBlock → User (blocker)
ALTER TABLE `UserBlock`
  ADD CONSTRAINT `UserBlock_blockerId_fkey`
  FOREIGN KEY (`blockerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey UserBlock → User (blocked)
ALTER TABLE `UserBlock`
  ADD CONSTRAINT `UserBlock_blockedId_fkey`
  FOREIGN KEY (`blockedId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
