-- CreateTable
CREATE TABLE `ImaneProgramDay` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `coranTilawa` BOOLEAN NOT NULL DEFAULT false,
    `dhikrMatinSoir` BOOLEAN NOT NULL DEFAULT false,
    `duasPersonnelles` BOOLEAN NOT NULL DEFAULT false,
    `sadaqa` BOOLEAN NOT NULL DEFAULT false,
    `autreBienfait` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ImaneProgramDay_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuranFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `surah` INTEGER NOT NULL,
    `ayah` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuranFavorite_user_idx`(`userId`),
    INDEX `QuranFavorite_user_surah_ayah_idx`(`userId`, `surah`, `ayah`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DhikrFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DhikrFavorite_user_entry_idx`(`userId`, `entryId`),
    UNIQUE INDEX `DhikrFavorite_user_entry_key`(`userId`, `entryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImaneProgramDay` ADD CONSTRAINT `ImaneProgramDay_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuranFavorite` ADD CONSTRAINT `QuranFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DhikrFavorite` ADD CONSTRAINT `DhikrFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DhikrFavorite` ADD CONSTRAINT `DhikrFavorite_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `DhikrEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
