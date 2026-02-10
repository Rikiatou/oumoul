-- AlterTable
ALTER TABLE `DhikrCategory` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `DhikrEntry` MODIFY `arabicText` TEXT NOT NULL,
    MODIFY `translit` TEXT NULL,
    MODIFY `translation` TEXT NULL,
    MODIFY `source` TEXT NULL;
