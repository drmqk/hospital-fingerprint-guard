export type ShiftType = 'morning' | 'evening' | 'night' | '24h_duty' | 'rounds' | 'clinic' | 'custom';

export type FingerprintStatus = 'pending' | 'clocked_in' | 'clocked_out' | 'grace_period' | 'missed' | 'excused';

export interface HospitalShift {
  id: string;
  title: string;
  shiftType: ShiftType;
  hospitalName: string;
  department: string;
  locationDetails?: string;
  fingerprintStation: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm (24h)
  fingerprintInRequired: boolean;
  fingerprintOutRequired: boolean;
  fingerprintInWindowMinutes: number; // e.g. 20 min before to 15 min after
  fingerprintOutWindowMinutes: number; // e.g. 0 min before to 30 min after
  fingerprintInStatus: FingerprintStatus;
  fingerprintOutStatus: FingerprintStatus;
  fingerprintInTimestamp?: string;
  fingerprintOutTimestamp?: string;
  remindersMinutesBefore: number[]; // e.g. [60, 30, 15, 0]
  lastNotifiedReminders?: number[]; // track which reminders were already triggered
  notes?: string;
  color?: string;
  googleCalendarEventId?: string;
  lastSyncedWithGoogle?: string;
  is24hSplit?: boolean;
  splitPart?: 1 | 2;
  parent24hShiftId?: string;
  restPeriodHoursAfter?: number;
  restPeriodEndsAt?: string;
  missedMinutes?: number; // Minutes missed if late in or early out
  scheduledDurationHours?: number; // e.g. 12, 18, 24
  isHalfCycle?: boolean; // 12h half-cycle at cutoff or rotation end
  isIncompleteCycle?: boolean; // Custom cutoff to meet desired end time
}

export type ShiftDurationOption = 12 | 18 | 24;

export interface RotationCycle {
  cycleIndex: number;
  cycleTitle: string; // e.g. "Monday Duty Cycle", "Tuesday Afternoon Cycle"
  dayName: string; // "Monday", "Tuesday", etc.
  timeOfDay: string; // "Morning", "Afternoon", "Evening", "Night"
  shifts: HospitalShift[];
  workDurationHours: number;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  restStartTimeFormatted: string;
  restEndTimeFormatted: string;
  restDurationHours: number;
  nextShiftStartTimeFormatted: string;
  isHalfCycle?: boolean;
  isIncompleteCycle?: boolean;
}

export interface PlannedRotationSeries {
  cycles: RotationCycle[];
  seriesStartDateFormatted: string;
  seriesEndDateFormatted: string;
  seriesEndDateWorkFormatted?: string;
  totalDutyHours: number;
  totalRestHours: number;
  totalBiometricPunches: number;
  totalDaysSpan?: number;
  hasIncompleteCycle?: boolean;
  targetCutoffFormatted?: string;
  targetCutoffIso?: string;
}

export interface MonthlyIncomeSummary {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "October 2026"
  hourlyRate: number;
  currency: string;
  scheduledHours: number;
  missedMinutesTotal: number;
  missedHoursDiscount: number;
  netHoursAttended: number;
  grossIncome: number;
  discountAmount: number;
  netIncome: number;
}

export interface MonthPlannerConfig {
  shiftDuration: ShiftDurationOption;
  startDate: string; // YYYY-MM-DD
  startHour: string; // HH:mm
  planningScope?: 'full_month' | 'desired_end_time' | 'cycle_count';
  targetMonth?: string; // e.g. "2026-10"
  desiredEndDate?: string; // YYYY-MM-DD
  desiredEndTime?: string; // HH:mm
  allowIncompleteCycle?: boolean; // Accept half-cycle / partial cycle at desired end time
  cycleCount?: number; // Number of duty cycles to generate (e.g. 5, 10, 20, 25, 31)
  restHours: number; // 6 hours mandatory rest
  timeFormat: '12h' | '24h'; // Default '12h' with AM/PM
  hospitalName: string;
  department: string;
  fingerprintStation: string;
  autoDivide24h: boolean; // each 24h divided into 12h blocks with in & out fingerprint
  enforce6hRest: boolean; // every 24h work followed by 6h mandatory rest
  rotationMode?: 'continuous_after_rest' | 'custom_days';
  pattern?: 'rotation_rest' | 'every_other_day' | 'weekdays' | 'custom';
  selectedDays?: boolean[];
}

// Keep WeekPlannerConfig as alias for backward compatibility
export type WeekPlannerConfig = MonthPlannerConfig;

export interface PlannedDaySchedule {
  dayIndex: number;
  dayName: string;
  date: string;
  isWorkDay: boolean;
  isRestPeriod: boolean;
  restNote?: string;
  shifts: HospitalShift[];
}

export type TaskPriority = 'urgent' | 'high' | 'normal';
export type TaskCategory = 'medication' | 'lab_review' | 'patient_rounding' | 'handover' | 'procedure' | 'fingerprint_check' | 'other';

export interface DutyTask {
  id: string;
  shiftId?: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  completed: boolean;
  completedAt?: string;
  alarmEnabled: boolean;
  alarmSound: 'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse';
  alarmTriggered?: boolean;
  notes?: string;
  patientRoomOrBed?: string;
  snoozedUntil?: string; // ISO string
}

export interface FingerprintLogEntry {
  id: string;
  shiftId: string;
  shiftTitle: string;
  hospitalName: string;
  department: string;
  station: string;
  type: 'in' | 'out';
  scheduledTime: string;
  actualTimestamp: string;
  status: 'on_time' | 'grace_period' | 'late' | 'excused';
  differenceMinutes: number; // positive = after target, negative = early
  missedMinutes?: number; // Minutes discounted from shift
  notes?: string;
}

export interface UserProfile {
  name: string;
  title: string; // e.g. "Dr. Mohamed Alkenawy", "Specialist Physician"
  email: string;
  avatarUrl?: string;
  hospitalName: string;
  defaultDepartment: string;
  defaultFingerprintStation: string;
  reminderIntervals: number[]; // [60, 30, 15, 0]
  alarmVolume: number; // 0.0 - 1.0
  alarmTone: 'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse';
  enableSoundAlarms: boolean;
  enableBrowserNotifications: boolean;
  autoSyncGoogleCalendar: boolean;
  timeFormat: '12h' | '24h'; // Default '12h' system with AM/PM
  hourlyRate: number; // Price per hour (e.g. 50)
  currency: string; // Currency symbol (e.g. '$', 'EGP', 'SAR', '€', '£')
  language?: 'en' | 'ar'; // Default 'en' or 'ar'
}

export interface ActiveAlarmState {
  id: string;
  title: string;
  subtitle: string;
  type: 'fingerprint_in' | 'fingerprint_out' | 'duty_task' | 'shift_start';
  referenceId: string; // taskId or shiftId
  priority: TaskPriority;
  soundType: 'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse';
  timestamp: string;
}
