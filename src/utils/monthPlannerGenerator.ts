import {
  HospitalShift,
  MonthPlannerConfig,
  RotationCycle,
  PlannedRotationSeries,
  ShiftDurationOption,
} from '../types';
import {
  formatHMTo12,
  formatTime,
  formatDateTime12,
  getTimeOfDayLabel,
} from './timeFormat';
import { Language, translations } from './i18n';

/**
 * Format Date object to YYYY-MM-DD
 */
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add hours to Date
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

/**
 * Format Date to HH:mm (24h internal)
 */
export function formatTimeHM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Get Arabic Day Name
 */
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export function getLocalizedDayName(d: Date, lang: Language = 'en'): string {
  if (lang === 'ar') {
    return ARABIC_DAYS[d.getDay()];
  }
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getLocalizedTimeOfDay(d: Date, lang: Language = 'en'): string {
  const hour = d.getHours();
  if (lang === 'ar') {
    if (hour >= 5 && hour < 12) return 'صباحاً';
    if (hour >= 12 && hour < 17) return 'ظهراً';
    if (hour >= 17 && hour < 21) return 'مساءً';
    return 'ليلاً';
  }
  return getTimeOfDayLabel(d);
}

/**
/**
 * Calculates the exact target cutoff date and time for the plan within the month
 */
export function getPlanCutoffDate(config: MonthPlannerConfig): Date {
  const {
    planningScope = 'full_month',
    desiredEndDate,
    desiredEndTime = '20:00',
    targetMonth,
    startDate,
    startHour = '08:00',
    cycleCount = 10,
    shiftDuration = 24,
    restHours = 6,
  } = config;

  if (planningScope === 'cycle_count') {
    const [shH, shM] = startHour.split(':').map(Number);
    const start = new Date(`${startDate}T${String(shH).padStart(2, '0')}:${String(shM).padStart(2, '0')}:00`);
    return addHours(start, cycleCount * (shiftDuration + restHours) + 24);
  }

  // If desiredEndDate is explicitly set, use it
  if (desiredEndDate) {
    const [deh, dem] = (desiredEndTime || '20:00').split(':').map(Number);
    return new Date(`${desiredEndDate}T${String(deh).padStart(2, '0')}:${String(dem).padStart(2, '0')}:00`);
  }

  // Otherwise calculate the last day of targetMonth
  if (targetMonth) {
    const [year, month] = targetMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const [deh, dem] = (desiredEndTime || '20:00').split(':').map(Number);
    return new Date(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T${String(deh).padStart(2, '0')}:${String(dem).padStart(2, '0')}:00`);
  }

  const startD = new Date(startDate);
  const lastDay = new Date(startD.getFullYear(), startD.getMonth() + 1, 0).getDate();
  const mStr = String(startD.getMonth() + 1).padStart(2, '0');
  return new Date(`${startD.getFullYear()}-${mStr}-${String(lastDay).padStart(2, '0')}T20:00:00`);
}

/**
 * Returns the last day date string (YYYY-MM-DD) for a given YYYY-MM
 */
export function getLastDateOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Generates continuous hospital rotation cycles for a month or target desired end time.
 * Includes:
 * 1. Continuous rotation: Shift duration followed by mandatory 6h rest.
 * 2. Next shift starts IMMEDIATELY after 6h rest.
 * 3. Supports planning by End Date & Time within the same month.
 * 4. Accepts and creates Incomplete / Half Cycles (12h) when reaching target cutoff.
 * 5. Full bilingual (English / Arabic) support.
 */
export function generateMonthRotationCycles(
  config: MonthPlannerConfig,
  lang: Language = 'en'
): RotationCycle[] {
  const {
    shiftDuration,
    startDate,
    startHour,
    planningScope = 'full_month',
    allowIncompleteCycle = true,
    cycleCount = 10,
    restHours = 6,
    hospitalName,
    department,
    fingerprintStation,
    autoDivide24h,
    timeFormat = '12h',
  } = config;

  const [shH, shM] = startHour.split(':').map(Number);
  let currentTime = new Date(`${startDate}T${String(shH).padStart(2, '0')}:${String(shM).padStart(2, '0')}:00`);
  const targetCutoffDate = getPlanCutoffDate(config);

  const cycles: RotationCycle[] = [];
  const maxCycles = planningScope === 'cycle_count' ? Math.max(1, Math.min(31, cycleCount || 10)) : 31;

  let cycleIndex = 1;

  while (currentTime < targetCutoffDate && cycleIndex <= maxCycles) {
    const cycleStart = new Date(currentTime);
    const dayName = getLocalizedDayName(cycleStart, lang);
    const timeOfDay = getLocalizedTimeOfDay(cycleStart, lang);

    // Calculate remaining hours until desired cutoff
    const remainingHoursUntilCutoff = (targetCutoffDate.getTime() - cycleStart.getTime()) / 3600000;

    // If remaining time is very small (less than 2 hours), terminate
    if (remainingHoursUntilCutoff < 2 && planningScope !== 'cycle_count') {
      break;
    }

    // Check if this cycle is an incomplete or half-cycle
    const isRestrictedByCutoff =
      planningScope !== 'cycle_count' && remainingHoursUntilCutoff < shiftDuration;

    let actualCycleWorkHours: number = shiftDuration;
    let isHalfCycle = false;
    let isIncompleteCycle = false;

    if (isRestrictedByCutoff) {
      if (!allowIncompleteCycle) {
        // User disabled incomplete cycles, stop here
        break;
      }

      // If user is doing 24h shifts and remaining time is between 10h and 23h, make it a clean 12h Half-Cycle!
      if (shiftDuration === 24 && remainingHoursUntilCutoff >= 10) {
        actualCycleWorkHours = 12;
        isHalfCycle = true;
        isIncompleteCycle = true;
      } else {
        // Partial cutoff duty
        actualCycleWorkHours = Math.max(4, Math.floor(remainingHoursUntilCutoff));
        isIncompleteCycle = true;
      }
    }

    const cycleTitle =
      lang === 'ar'
        ? isHalfCycle
          ? `نوبة ${dayName} (${timeOfDay}) — نصف دورة (12 ساعة)`
          : isIncompleteCycle
          ? `نوبة ${dayName} (${timeOfDay}) — دورة غير مكتملة (${actualCycleWorkHours} س)`
          : `نوبة ${dayName} (${timeOfDay})`
        : isHalfCycle
        ? `${dayName} ${timeOfDay} Duty — Half Cycle (12h)`
        : isIncompleteCycle
        ? `${dayName} ${timeOfDay} Duty — Incomplete Cycle (${actualCycleWorkHours}h)`
        : `${dayName} ${timeOfDay} Duty`;

    const shiftsInCycle: HospitalShift[] = [];
    let workEnd: Date;

    if (shiftDuration === 24 && autoDivide24h && !isHalfCycle && !isIncompleteCycle) {
      // --- STANDARD 24-HOUR DUTY: DIVIDED INTO TWO 12-HOUR SHIFTS ---
      const p1Start = new Date(cycleStart);
      const p1End = addHours(p1Start, 12);
      const p2Start = new Date(p1End);
      const p2End = addHours(p2Start, 12);
      workEnd = p2End;

      const restStart = new Date(workEnd);
      const restEnd = addHours(restStart, restHours);

      const p1Start12 = formatTime(p1Start, '12h');
      const p1End12 = formatTime(p1End, '12h');
      const p2Start12 = formatTime(p2Start, '12h');
      const p2End12 = formatTime(p2End, '12h');
      const restEnd12 = formatDateTime12(restEnd);

      const p1Title =
        lang === 'ar'
          ? `نوبتجية ${dayName} — الجزء 1: أول 12 ساعة (${p1Start12} - ${p1End12})`
          : `${dayName} Duty — Part 1: First 12h (${p1Start12} - ${p1End12})`;

      const p2Title =
        lang === 'ar'
          ? `نوبتجية ${dayName} — الجزء 2: ثاني 12 ساعة (${p2Start12} - ${p2End12})`
          : `${dayName} Duty — Part 2: Second 12h (${p2Start12} - ${p2End12})`;

      const shiftPart1: HospitalShift = {
        id: `c${cycleIndex}-p1-${formatDateYMD(p1Start)}-${formatTimeHM(p1Start).replace(':', '')}`,
        title: p1Title,
        shiftType: '24h_duty',
        hospitalName,
        department,
        locationDetails: `Station: ${fingerprintStation} (1st 12h)`,
        fingerprintStation,
        startDate: formatDateYMD(p1Start),
        startTime: formatTimeHM(p1Start),
        endDate: formatDateYMD(p1End),
        endTime: formatTimeHM(p1End),
        fingerprintInRequired: true,
        fingerprintOutRequired: true,
        fingerprintInWindowMinutes: 20,
        fingerprintOutWindowMinutes: 25,
        fingerprintInStatus: 'pending',
        fingerprintOutStatus: 'pending',
        remindersMinutesBefore: [60, 30, 15, 0],
        notes:
          lang === 'ar'
            ? `الجزء الأول من نوبتجية ${dayName}. تسجيل حضور في ${p1Start12}، وتسجيل انصراف في ${p1End12} قبل بدء الجزء الثاني.`
            : `${dayName} Part 1. Mandatory IN punch at ${p1Start12}, and OUT punch at ${p1End12} before Part 2 starts.`,
        color: '#ef4444',
        is24hSplit: true,
        splitPart: 1,
        scheduledDurationHours: 12,
      };

      const shiftPart2: HospitalShift = {
        id: `c${cycleIndex}-p2-${formatDateYMD(p2Start)}-${formatTimeHM(p2Start).replace(':', '')}`,
        title: p2Title,
        shiftType: '24h_duty',
        hospitalName,
        department,
        locationDetails: `Station: ${fingerprintStation} (2nd 12h)`,
        fingerprintStation,
        startDate: formatDateYMD(p2Start),
        startTime: formatTimeHM(p2Start),
        endDate: formatDateYMD(p2End),
        endTime: formatTimeHM(p2End),
        fingerprintInRequired: true,
        fingerprintOutRequired: true,
        fingerprintInWindowMinutes: 20,
        fingerprintOutWindowMinutes: 25,
        fingerprintInStatus: 'pending',
        fingerprintOutStatus: 'pending',
        remindersMinutesBefore: [60, 30, 15, 0],
        notes:
          lang === 'ar'
            ? `الجزء الثاني من نوبتجية ${dayName}. تسجيل حضور في ${p2Start12}، وتسجيل انصراف في ${p2End12}. يليه مباشرة 6 ساعات راحة إجبارية حتى ${restEnd12}.`
            : `${dayName} Part 2. Mandatory IN punch at ${p2Start12}, and OUT punch at ${p2End12}. Followed by 6h mandatory rest until ${restEnd12}.`,
        color: '#dc2626',
        is24hSplit: true,
        splitPart: 2,
        restPeriodHoursAfter: restHours,
        restPeriodEndsAt: restEnd12,
        scheduledDurationHours: 12,
      };

      shiftsInCycle.push(shiftPart1, shiftPart2);
    } else if (isHalfCycle) {
      // --- HALF CYCLE (12h Duty instead of 24h to fit Desired End Time) ---
      const sStart = new Date(cycleStart);
      const sEnd = addHours(sStart, 12);
      workEnd = sEnd;

      const restStart = new Date(workEnd);
      const restEnd = addHours(restStart, restHours);

      const sStart12 = formatTime(sStart, '12h');
      const sEnd12 = formatTime(sEnd, '12h');
      const restEnd12 = formatDateTime12(restEnd);

      const title =
        lang === 'ar'
          ? `نوبة ${dayName} — نصف دورة 12 ساعة (${sStart12} - ${sEnd12})`
          : `${dayName} Duty — Half-Cycle 12h (${sStart12} - ${sEnd12})`;

      const halfShift: HospitalShift = {
        id: `c${cycleIndex}-half12-${formatDateYMD(sStart)}-${formatTimeHM(sStart).replace(':', '')}`,
        title,
        shiftType: 'morning',
        hospitalName,
        department,
        locationDetails: `Station: ${fingerprintStation} (Half-Cycle)`,
        fingerprintStation,
        startDate: formatDateYMD(sStart),
        startTime: formatTimeHM(sStart),
        endDate: formatDateYMD(sEnd),
        endTime: formatTimeHM(sEnd),
        fingerprintInRequired: true,
        fingerprintOutRequired: true,
        fingerprintInWindowMinutes: 20,
        fingerprintOutWindowMinutes: 25,
        fingerprintInStatus: 'pending',
        fingerprintOutStatus: 'pending',
        remindersMinutesBefore: [60, 30, 15, 0],
        notes:
          lang === 'ar'
            ? `نصف دورة (12 ساعة) معتمدة للوصول إلى وقت النهاية المطلوب. بصمة حضور في ${sStart12} وبصمة انصراف في ${sEnd12}.`
            : `Half-Cycle 12h duty to match desired end time. Clock IN at ${sStart12}, Clock OUT at ${sEnd12}.`,
        color: '#06b6d4', // Cyan
        isHalfCycle: true,
        isIncompleteCycle: true,
        scheduledDurationHours: 12,
        restPeriodHoursAfter: restHours,
        restPeriodEndsAt: restEnd12,
      };

      shiftsInCycle.push(halfShift);
    } else {
      // --- CUSTOM / INCOMPLETE SHIFT (e.g. 18h, 12h, or partial cutoff) ---
      const sStart = new Date(cycleStart);
      const sEnd = addHours(sStart, actualCycleWorkHours);
      workEnd = sEnd;

      const restStart = new Date(workEnd);
      const restEnd = addHours(restStart, restHours);

      const sStart12 = formatTime(sStart, '12h');
      const sEnd12 = formatTime(sEnd, '12h');
      const restEnd12 = formatDateTime12(restEnd);

      const title =
        lang === 'ar'
          ? isIncompleteCycle
            ? `نوبة ${dayName} — دورة غير مكتملة ${actualCycleWorkHours} ساعة (${sStart12} - ${sEnd12})`
            : `نوبة ${dayName} (${actualCycleWorkHours} ساعة: ${sStart12} - ${sEnd12})`
          : isIncompleteCycle
          ? `${dayName} Duty — Incomplete Cycle ${actualCycleWorkHours}h (${sStart12} - ${sEnd12})`
          : `${dayName} ${actualCycleWorkHours}h Duty (${sStart12} - ${sEnd12})`;

      const singleShift: HospitalShift = {
        id: `c${cycleIndex}-shift-${formatDateYMD(sStart)}-${formatTimeHM(sStart).replace(':', '')}`,
        title,
        shiftType: actualCycleWorkHours >= 18 ? 'night' : 'morning',
        hospitalName,
        department,
        locationDetails: `Station: ${fingerprintStation}`,
        fingerprintStation,
        startDate: formatDateYMD(sStart),
        startTime: formatTimeHM(sStart),
        endDate: formatDateYMD(sEnd),
        endTime: formatTimeHM(sEnd),
        fingerprintInRequired: true,
        fingerprintOutRequired: true,
        fingerprintInWindowMinutes: 20,
        fingerprintOutWindowMinutes: 25,
        fingerprintInStatus: 'pending',
        fingerprintOutStatus: 'pending',
        remindersMinutesBefore: [60, 30, 15, 0],
        notes:
          lang === 'ar'
            ? `نوبة عمل ${actualCycleWorkHours} ساعة. بصمة حضور عند ${sStart12} وبصمة انصراف عند ${sEnd12}. يليها راحة 6 ساعات.`
            : `Duty shift for ${actualCycleWorkHours}h. Clock IN at ${sStart12}, Clock OUT at ${sEnd12}. Followed by 6h rest.`,
        color: isIncompleteCycle ? '#f59e0b' : '#3b82f6',
        isIncompleteCycle,
        scheduledDurationHours: actualCycleWorkHours,
        restPeriodHoursAfter: restHours,
        restPeriodEndsAt: restEnd12,
      };

      shiftsInCycle.push(singleShift);
    }

    // Calculate rest times
    const restStart = new Date(workEnd);
    const restEnd = addHours(restStart, restHours);

    // CRITICAL: Next shift starts IMMEDIATELY after 6h rest!
    const nextShiftStart = new Date(restEnd);

    cycles.push({
      cycleIndex,
      cycleTitle,
      dayName,
      timeOfDay,
      shifts: shiftsInCycle,
      workDurationHours: actualCycleWorkHours,
      startDate: formatDateYMD(cycleStart),
      startTime: formatTimeHM(cycleStart),
      endDate: formatDateYMD(workEnd),
      endTime: formatTimeHM(workEnd),
      startTimeFormatted: formatDateTime12(cycleStart),
      endTimeFormatted: formatDateTime12(workEnd),
      restStartTimeFormatted: formatDateTime12(restStart),
      restEndTimeFormatted: formatDateTime12(restEnd),
      restDurationHours: restHours,
      nextShiftStartTimeFormatted: formatDateTime12(nextShiftStart),
      isHalfCycle,
      isIncompleteCycle,
    });

    // Advance pointer for next cycle immediately after rest
    currentTime = new Date(restEnd);
    cycleIndex++;

    // If this cycle was already a cutoff incomplete cycle, stop after it
    if (isIncompleteCycle) {
      break;
    }
  }

  return cycles;
}

/**
 * Returns month rotation cycles along with aggregate series statistics
 */
export function generateMonthRotationSeries(
  config: MonthPlannerConfig,
  lang: Language = 'en'
): PlannedRotationSeries {
  const cycles = generateMonthRotationCycles(config, lang);
  const targetCutoff = getPlanCutoffDate(config);
  const targetCutoffFormatted = formatDateTime12(targetCutoff);
  const targetCutoffIso = targetCutoff.toISOString();

  const seriesStartDateFormatted = cycles[0]?.startTimeFormatted || '';
  const seriesEndDateWorkFormatted = cycles[cycles.length - 1]?.endTimeFormatted || '';
  const seriesEndDateFormatted = cycles[cycles.length - 1]?.restEndTimeFormatted || '';
  const totalDutyHours = cycles.reduce((acc, c) => acc + c.workDurationHours, 0);
  const totalRestHours = cycles.reduce((acc, c) => acc + c.restDurationHours, 0);
  const totalBiometricPunches = cycles.reduce((acc, c) => acc + c.shifts.length * 2, 0);
  const totalHours = totalDutyHours + totalRestHours;
  const totalDaysSpan = parseFloat((totalHours / 24).toFixed(1));
  const hasIncompleteCycle = cycles.some((c) => c.isIncompleteCycle || c.isHalfCycle);

  return {
    cycles,
    seriesStartDateFormatted,
    seriesEndDateFormatted,
    seriesEndDateWorkFormatted,
    totalDutyHours,
    totalRestHours,
    totalBiometricPunches,
    totalDaysSpan,
    hasIncompleteCycle,
    targetCutoffFormatted,
    targetCutoffIso,
  };
}

/**
 * Default Month Planner Config
 */
export function getDefaultMonthConfig(
  duration: ShiftDurationOption = 24,
  hospitalName: string,
  department: string,
  station: string
): MonthPlannerConfig {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
  const startDateStr = formatDateYMD(today);

  // Default desired end date within the same month: last day of current month
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return {
    shiftDuration: duration,
    startDate: startDateStr,
    startHour: '08:00',
    planningScope: 'full_month',
    targetMonth: currentMonthStr,
    desiredEndDate: endOfMonthDateStr,
    desiredEndTime: '20:00',
    allowIncompleteCycle: true,
    cycleCount: 10,
    restHours: 6,
    timeFormat: '12h',
    hospitalName,
    department,
    fingerprintStation: station,
    autoDivide24h: true,
    enforce6hRest: true,
  };
}

// Re-exports for backward compatibility
export const generateContinuousRotationCycles = generateMonthRotationCycles;
export const generateContinuousRotationSeries = generateMonthRotationSeries;
export const getDefaultWeekConfig = getDefaultMonthConfig;
