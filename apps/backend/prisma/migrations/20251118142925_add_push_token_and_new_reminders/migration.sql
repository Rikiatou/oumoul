-- AlterTable
ALTER TABLE `ReminderPreference` MODIFY `type` ENUM('AfterEid', 'WeeklyMonday', 'WeeklyThursday', 'Monthly', 'Custom', 'ImaneProgramDaily', 'RamadanDailyCheckin') NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `pushPlatform` VARCHAR(191) NULL,
    ADD COLUMN `pushToken` VARCHAR(191) NULL;
