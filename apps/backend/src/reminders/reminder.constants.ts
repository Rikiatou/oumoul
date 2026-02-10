export const REMINDER_QUEUE = 'reminder-queue';

export enum ReminderJobType {
  AfterEid = 'AfterEid',
  WeeklyMonday = 'WeeklyMonday',
  WeeklyThursday = 'WeeklyThursday',
  Monthly = 'Monthly',
  Custom = 'Custom',
  ImaneProgramDaily = 'ImaneProgramDaily',
  RamadanDailyCheckin = 'RamadanDailyCheckin',
}
