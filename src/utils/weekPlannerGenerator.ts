import {
  HospitalShift,
  WeekPlannerConfig,
  PlannedDaySchedule,
  RotationCycle,
  ShiftDurationOption,
} from '../types';
import {
  formatHMTo12,
  formatTime,
  formatDateTime12,
  getTimeOfDayLabel,
} from './timeFormat';

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add hours to a Date
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

/**
 * Format Date to HH:mm (24h internal for input tags and math)
 */
export function formatTimeHM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Generates continuous hospital rotation cycles:
 * 1. Cycles are explicitly named by Day Name (e.g. "Monday Morning Duty", "Tuesday Afternoon Duty").
 * 2. All times formatted with 12h system with AM/PM (or 24h if configured).
 * 3. After work (12h, 18h, or 24h) completes, there is a mandatory 6h rest.
 * 4. IMMEDIATELY after the 6h rest, the NEXT shift starts!
 */
export function generateContinuousRotationCycles(config: WeekPlannerConfig): RotationCycle[] {
  const {
    shiftDuration,
    startDate,
    startHour,
    cycleCount,
    restHours = 6,
    hospitalName,
    department,
    fingerprintStation,
    autoDivide24h,
    timeFormat = '12h',
  } = config;

  const [shH, shM] = startHour.split(':').map(Number);
  let currentTime = new Date(`${startDate}T${String(shH).padStart(2, '0')}:${String(shM).padStart(2, '0')}:00`);

  const cycles: RotationCycle[] = [];
  const totalCycles = Math.max(1, Math.min(20, cycleCount || 5));

  for (let c = 1; c <= totalCycles; c++) {
    const cycleStart = new Date(currentTime);
    const dayName = cycleStart.toLocaleDateString(undefined, { weekday: 'long' });
    const timeOfDay = getTimeOfDayLabel(cycleStart);
    const cycleTitle = `${dayName} ${timeOfDay} Duty`;

    const shiftsInCycle: HospitalShift[] = [];
    let workEnd: Date;

    if (shiftDuration === 24 && autoDivide24h) {
      // --- 24-HOUR DUTY: DIVIDED INTO TWO 12-HOUR SHIFTS ---
      // Both Part 1 and Part 2 have their own IN and OUT fingerprints!
      const parent24hId = `cycle-${dayName.toLowerCase()}-${c}-24h-${Date.now()}`;

      // Part 1: First 12 Hours
      const p1Start = new Date(cycleStart);
      const p1End = addHours(p1Start, 12);

      // Part 2: Second 12 Hours (starts immediately when Part 1 ends)
      const p2Start = new Date(p1End);
      const p2End = addHours(p2Start, 12);
      workEnd = p2End;

      // 6h mandatory rest after 24h duty finishes
      const restStart = new Date(workEnd);
      const restEnd = addHours(restStart, restHours);

      const p1Start12 = formatTime(p1Start, '12h');
      const p1End12 = formatTime(p1End, '12h');
      const p2Start12 = formatTime(p2Start, '12h');
      const p2End12 = formatTime(p2End, '12h');
      const restEnd12 = formatDateTime12(restEnd);

      const shiftPart1: HospitalShift = {
        id: `c${c}-p1-${formatDateYMD(p1Start)}-${formatTimeHM(p1Start).replace(':', '')}`,
        title: `${dayName} Duty — Part 1: First 12h (${p1Start12} - ${p1End12})`,
        shiftType: '24h_duty',
        hospitalName,
        department,
        locationDetails: `Station: ${fingerprintStation} (1st 12h Period)`,
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
        notes: `${dayName} Part 1. Mandatory IN punch at ${p1Start12}, and OUT punch at ${p1End12} before Part 2 starts.`,
        color: '#ef4444', // Red
        is24hSplit: true,
        splitPart: 1,
        parent24hShiftId: parent24hId,
      };

      const shiftPart2: HospitalShift = {
        id: `c${c}-p2-${formatDateYMD(p2Start)}-${formatTimeHM(p2Start).replace(':', '')}`,
        title: `${dayName} Duty — Part 2: Second 12h (${p2Start12} - ${p2End12})`,
        shiftType: 'night',
        hospitalName,
        department,
        locationDetails: `Station: ${fingerprintStation} (2nd 12h Period)`,
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
        notes: `${dayName} Part 2. Mandatory IN punch at ${p2Start12}, and OUT punch at ${p2End12}. Followed by 6h mandatory rest until ${restEnd12}, when the next shift starts immediately!`,
        color: '#f97316', // Orange
        is24hSplit: true,
        splitPart: 2,
        parent24hShiftId: parent24hId,
        restPeriodHoursAfter: restHours,
        restPeriodEndsAt: restEnd12,
      };

      shiftsInCycle.push(shiftPart1, shiftPart2);
    } else if (shiftDuration === 18) {
      // --- 18-HOUR CLINICAL SHIFT ---
      const sStart = new Date(cycleStart);
      const sEnd = addHours(sStart, 18);
      workEnd = sEnd;

      const restStart = new Date(workEnd);
      const restEnd = addHours(restStart, restHours);

      const sStart12 = formatTime(sStart, '12h');
      const sEnd12 = formatTime(sEnd, '12h');
      const restEnd12 = formatDateTime12(restEnd);

      const shift18: HospitalShift = {
        id: `c${c}-18h-${formatDateYMD(sStart)}-${formatTimeHM(sStart).replace(':', '')}`,
        title: `${dayName} 18h Extended Duty (${sStart12} - ${sEnd12})`,
        shiftType: 'night',
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
        fingerprintOutWindowMinutes: 30,
        fingerprintInStatus: 'pending',
        fingerprintOutStatus: 'pending',
        remindersMinutesBefore: [60, 30, 15, 0],
        notes: `${dayName} 18h Duty. IN punch at ${sStart12}, OUT punch at ${sEnd12}. Followed by 6h mandatory rest until ${restEnd12}. Next shift starts immediately after!`,
        color: '#8b5cf6', // Purple
        restPeriodHoursAfter: restHours,
        restPeriodEndsAt: restEnd12,
      };

      shiftsInCycle.push(shift18);
    } else {
      // --- 12-HOUR CLINICAL SHIFT ---
      const sStart = new Date(cycleStart);
      const sEnd = addHours(sStart, 12);
      workEnd = sEnd;

      const restStart = new Date(workEnd);
      const restEnd = addHours(restStart, restHours);

      const sStart12 = formatTime(sStart, '12h');
      const sEnd12 = formatTime(sEnd, '12h');
      const restEnd12 = formatDateTime12(restEnd);

      const shift12: HospitalShift = {
        id: `c${c}-12h-${formatDateYMD(sStart)}-${formatTimeHM(sStart).replace(':', '')}`,
        title: `${dayName} 12h Duty (${sStart12} - ${sEnd12})`,
        shiftType: 'morning',
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
        notes: `${dayName} 12h Duty. IN punch at ${sStart12}, OUT punch at ${sEnd12}. Followed by 6h mandatory rest until ${restEnd12}. Next shift starts immediately after!`,
        color: '#0284c7', // Sky Blue
        restPeriodHoursAfter: restHours,
        restPeriodEndsAt: restEnd12,
      };

      shiftsInCycle.push(shift12);
    }

    // Calculate rest times
    const restStart = new Date(workEnd);
    const restEnd = addHours(restStart, restHours);

    // CRITICAL: Next shift starts IMMEDIATELY after 6h rest!
    const nextShiftStart = new Date(restEnd);

    cycles.push({
      cycleIndex: c,
      cycleTitle,
      dayName,
      timeOfDay,
      shifts: shiftsInCycle,
      workDurationHours: shiftDuration,
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
    });

    // Advance pointer for next cycle
    currentTime = new Date(restEnd);
  }

  return cycles;
}

/**
 * Returns continuous rotation cycles along with overall start date/time and end date/time
 */
export function generateContinuousRotationSeries(config: WeekPlannerConfig): {
  cycles: RotationCycle[];
  seriesStartDateFormatted: string;
  seriesEndDateFormatted: string;
  seriesEndDateWorkFormatted: string;
  totalDutyHours: number;
  totalRestHours: number;
  totalBiometricPunches: number;
  totalDaysSpan: number;
} {
  const cycles = generateContinuousRotationCycles(config);
  const seriesStartDateFormatted = cycles[0]?.startTimeFormatted || '';
  const seriesEndDateWorkFormatted = cycles[cycles.length - 1]?.endTimeFormatted || '';
  const seriesEndDateFormatted = cycles[cycles.length - 1]?.restEndTimeFormatted || '';
  const totalDutyHours = cycles.reduce((acc, c) => acc + c.workDurationHours, 0);
  const totalRestHours = cycles.reduce((acc, c) => acc + c.restDurationHours, 0);
  const totalBiometricPunches = cycles.reduce((acc, c) => acc + c.shifts.length * 2, 0);
  const totalHours = totalDutyHours + totalRestHours;
  const totalDaysSpan = parseFloat((totalHours / 24).toFixed(1));

  return {
    cycles,
    seriesStartDateFormatted,
    seriesEndDateFormatted,
    seriesEndDateWorkFormatted,
    totalDutyHours,
    totalRestHours,
    totalBiometricPunches,
    totalDaysSpan,
  };
}

/**
 * Return default presets for 12, 18, and 24 hours
 */
export function getDefaultWeekConfig(
  duration: ShiftDurationOption = 24,
  hospitalName: string,
  department: string,
  station: string
): WeekPlannerConfig {
  const today = new Date();
  const startDateStr = formatDateYMD(today);

  let defaultCycles = 5;
  if (duration === 18) defaultCycles = 7;
  if (duration === 12) defaultCycles = 6;
  if (duration === 24) defaultCycles = 5;

  return {
    shiftDuration: duration,
    startDate: startDateStr,
    startHour: '08:00',
    rotationMode: 'continuous_after_rest',
    cycleCount: defaultCycles,
    restHours: 6,
    timeFormat: '12h', // Default 12h with AM/PM
    pattern: 'rotation_rest',
    selectedDays: [true, false, true, false, true, false, false],
    hospitalName,
    department,
    fingerprintStation: station,
    autoDivide24h: true,
    enforce6hRest: true,
  };
}
