export enum FastingLogStatusDto {
  FASTED = 'FASTED',
  EXEMPTION = 'EXEMPTION',
  MISSED = 'MISSED',
  MADE_UP = 'MADE_UP',
}

export enum MakeupStrategyDto {
  SixDaysAfterEid = 'SixDaysAfterEid',
  MondaysThursdays = 'MondaysThursdays',
  WhiteDays = 'WhiteDays',
  Custom = 'Custom',
}

export enum PlanEntryStatusDto {
  Pending = 'Pending',
  Completed = 'Completed',
  Skipped = 'Skipped',
}

export enum ReminderTypeDto {
  AfterEid = 'AfterEid',
  WeeklyMonday = 'WeeklyMonday',
  WeeklyThursday = 'WeeklyThursday',
  Monthly = 'Monthly',
  Custom = 'Custom',
}
