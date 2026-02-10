-- CreateTable
CREATE TABLE `TafsirSource` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NULL,
    `language` ENUM('FR', 'EN', 'AR') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TafsirSource_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TafsirEntry` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `surah` INTEGER NOT NULL,
    `ayahFrom` INTEGER NOT NULL,
    `ayahTo` INTEGER NULL,
    `language` ENUM('FR', 'EN', 'AR') NULL,
    `text` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TafsirEntry_source_surah_ayah_idx`(`sourceId`, `surah`, `ayahFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TafsirEntry` ADD CONSTRAINT `TafsirEntry_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `TafsirSource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
