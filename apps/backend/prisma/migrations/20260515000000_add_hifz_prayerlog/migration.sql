-- CreateTable HifzEntry
CREATE TABLE `HifzEntry` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `surahId` INTEGER NOT NULL,
    `surahName` VARCHAR(191) NOT NULL,
    `ayahFrom` INTEGER NOT NULL,
    `ayahTo` INTEGER NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 1,
    `ease` DOUBLE NOT NULL DEFAULT 2.5,
    `repetitions` INTEGER NOT NULL DEFAULT 0,
    `lastScore` INTEGER NULL,
    `nextReview` DATETIME(3) NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HifzEntry_user_surah_range_key`(`userId`, `surahId`, `ayahFrom`, `ayahTo`),
    INDEX `HifzEntry_user_nextReview_idx`(`userId`, `nextReview`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable PrayerLog
CREATE TABLE `PrayerLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `prayer` ENUM('Fajr','Dhuhr','Asr','Maghrib','Isha') NOT NULL,
    `status` ENUM('PRAYED_ON_TIME','PRAYED_LATE','MISSED','EXEMPTED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PrayerLog_user_date_prayer_key`(`userId`, `date`, `prayer`),
    INDEX `PrayerLog_user_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HifzEntry` ADD CONSTRAINT `HifzEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrayerLog` ADD CONSTRAINT `PrayerLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
