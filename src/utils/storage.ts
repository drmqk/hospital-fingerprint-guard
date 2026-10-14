import { HospitalShift, DutyTask, FingerprintLogEntry, UserProfile } from '../types';

const SHIFTS_KEY = 'hospital_guard_shifts_v1';
const TASKS_KEY = 'hospital_guard_tasks_v1';
const LOGS_KEY = 'hospital_guard_fingerprint_logs_v1';
const PROFILE_KEY = 'hospital_guard_profile_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Dr. Mohamed Alkenawy',
  title: 'Specialist Surgeon / Medical Officer',
  email: 'drmohamedalkenawy@gmail.com',
  hospitalName: 'Al-Noor Central Hospital',
  defaultDepartment: 'General Surgery & Trauma',
  defaultFingerprintStation: 'Station 3 - Surgical Tower Ground Gate',
  reminderIntervals: [60, 30, 15, 0],
  alarmVolume: 0.85,
  alarmTone: 'hospital_pager',
  enableSoundAlarms: true,
  enableBrowserNotifications: true,
  autoSyncGoogleCalendar: true,
  timeFormat: '12h',
  hourlyRate: 50,
  currency: '$',
};

// Generates sensible initial shifts centered on today
export function getInitialShifts(): HospitalShift[] {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  const todayStr = formatYMD(today);
  
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = formatYMD(yesterday);

  const tomorrow = new Date(today.getTime() + 86400000);
  const tomorrowStr = formatYMD(tomorrow);

  const dayAfter = new Date(today.getTime() + 2 * 86400000);
  const dayAfterStr = formatYMD(dayAfter);

  return [
    {
      id: 'shift-today-1',
      title: 'Surgery & Ward Duty Shift',
      shiftType: 'morning',
      hospitalName: 'Al-Noor Central Hospital',
      department: 'General Surgery & Trauma',
      locationDetails: 'OR 4 & Inpatient Ward Level 4',
      fingerprintStation: 'Station 3 - Surgical Tower Ground Gate',
      startDate: todayStr,
      startTime: '08:00',
      endDate: todayStr,
      endTime: '16:00',
      fingerprintInRequired: true,
      fingerprintOutRequired: true,
      fingerprintInWindowMinutes: 20,
      fingerprintOutWindowMinutes: 30,
      fingerprintInStatus: 'clocked_in',
      fingerprintOutStatus: 'pending',
      fingerprintInTimestamp: `${todayStr}T07:54:12`,
      remindersMinutesBefore: [60, 30, 15, 0],
      notes: 'Morning ward rounds at 08:30 with Senior Registrar. Check pre-op labs for laparoscopic cholecystectomy.',
      color: '#0284c7', // Sky Blue
    },
    {
      id: 'shift-tomorrow-2',
      title: 'Emergency On-Call Duty (24h)',
      shiftType: '24h_duty',
      hospitalName: 'Al-Noor Central Hospital',
      department: 'Emergency & Trauma Department',
      locationDetails: 'Resuscitation Bay & Triage Station 1',
      fingerprintStation: 'Station 1 - Emergency Main Kiosk',
      startDate: tomorrowStr,
      startTime: '08:00',
      endDate: dayAfterStr,
      endTime: '08:00',
      fingerprintInRequired: true,
      fingerprintOutRequired: true,
      fingerprintInWindowMinutes: 15,
      fingerprintOutWindowMinutes: 25,
      fingerprintInStatus: 'pending',
      fingerprintOutStatus: 'pending',
      remindersMinutesBefore: [60, 30, 15, 0],
      notes: '24-hour on call duty. Code Blue pager coverage. Mandatory attendance fingerprint verification required upon arrival.',
      color: '#ef4444', // Red
    },
    {
      id: 'shift-yesterday-0',
      title: 'Specialty Outpatient Clinic',
      shiftType: 'clinic',
      hospitalName: 'Al-Noor Central Hospital',
      department: 'Surgical Consultations OPD',
      locationDetails: 'Clinic Room 204',
      fingerprintStation: 'Station 2 - OPD Reception Terminal',
      startDate: yesterdayStr,
      startTime: '09:00',
      endDate: yesterdayStr,
      endTime: '15:00',
      fingerprintInRequired: true,
      fingerprintOutRequired: true,
      fingerprintInWindowMinutes: 15,
      fingerprintOutWindowMinutes: 30,
      fingerprintInStatus: 'clocked_in',
      fingerprintOutStatus: 'clocked_out',
      fingerprintInTimestamp: `${yesterdayStr}T08:52:40`,
      fingerprintOutTimestamp: `${yesterdayStr}T15:04:19`,
      remindersMinutesBefore: [60, 30, 15],
      notes: '32 post-operative follow-up consultations completed.',
      color: '#10b981', // Emerald
    },
  ];
}

export function getInitialTasks(): DutyTask[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return [
    {
      id: 'task-1',
      shiftId: 'shift-today-1',
      title: 'Fingerprint Clock-Out Window Check',
      category: 'fingerprint_check',
      priority: 'urgent',
      dueDate: todayStr,
      dueTime: '15:55',
      completed: false,
      alarmEnabled: true,
      alarmSound: 'hospital_pager',
      notes: 'Head to biometric Station 3 before leaving ward. Do not miss clock-out scan.',
    },
    {
      id: 'task-2',
      shiftId: 'shift-today-1',
      title: 'Post-op Lap Chole Antibiotics Order (Bed 402)',
      category: 'medication',
      priority: 'high',
      dueDate: todayStr,
      dueTime: '14:30',
      completed: false,
      alarmEnabled: true,
      alarmSound: 'code_urgent',
      patientRoomOrBed: 'Room 402, Bed A',
      notes: 'IV Ceftriaxone 1g + Metronidazole 500mg after surgical rounding.',
    },
    {
      id: 'task-3',
      shiftId: 'shift-today-1',
      title: 'ICU Bed 12 Arterial Blood Gas Review',
      category: 'lab_review',
      priority: 'urgent',
      dueDate: todayStr,
      dueTime: '13:00',
      completed: true,
      completedAt: `${todayStr}T13:05:00`,
      alarmEnabled: true,
      alarmSound: 'radar_pulse',
      patientRoomOrBed: 'Surgical ICU Bed 12',
      notes: 'Lactate trending down, ventilator weaning protocol approved.',
    },
    {
      id: 'task-4',
      shiftId: 'shift-today-1',
      title: 'Evening Shift Clinical Handoff to Dr. Tarek',
      category: 'handover',
      priority: 'high',
      dueDate: todayStr,
      dueTime: '15:45',
      completed: false,
      alarmEnabled: true,
      alarmSound: 'chime_alert',
      notes: 'Review pending abdominal CT scan for 56M and post-op drains status.',
    },
  ];
}

export function getInitialLogs(): FingerprintLogEntry[] {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = formatYMD(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = formatYMD(yesterday);

  return [
    {
      id: 'log-1',
      shiftId: 'shift-today-1',
      shiftTitle: 'Surgery & Ward Duty Shift',
      hospitalName: 'Al-Noor Central Hospital',
      department: 'General Surgery & Trauma',
      station: 'Station 3 - Surgical Tower Ground Gate',
      type: 'in',
      scheduledTime: `${todayStr} 08:00`,
      actualTimestamp: `${todayStr} 07:54:12`,
      status: 'on_time',
      differenceMinutes: -6,
      notes: 'Biometric scan verified successfully (Fingerprint ID #1042)',
    },
    {
      id: 'log-2',
      shiftId: 'shift-yesterday-0',
      shiftTitle: 'Specialty Outpatient Clinic',
      hospitalName: 'Al-Noor Central Hospital',
      department: 'Surgical Consultations OPD',
      station: 'Station 2 - OPD Reception Terminal',
      type: 'in',
      scheduledTime: `${yesterdayStr} 09:00`,
      actualTimestamp: `${yesterdayStr} 08:52:40`,
      status: 'on_time',
      differenceMinutes: -8,
      notes: 'Biometric scan verified successfully (Fingerprint ID #1042)',
    },
    {
      id: 'log-3',
      shiftId: 'shift-yesterday-0',
      shiftTitle: 'Specialty Outpatient Clinic',
      hospitalName: 'Al-Noor Central Hospital',
      department: 'Surgical Consultations OPD',
      station: 'Station 2 - OPD Reception Terminal',
      type: 'out',
      scheduledTime: `${yesterdayStr} 15:00`,
      actualTimestamp: `${yesterdayStr} 15:04:19`,
      status: 'on_time',
      differenceMinutes: 4,
      notes: 'Clock-out confirmed. 6.2 hours duty logged.',
    },
  ];
}

export function loadShifts(): HospitalShift[] {
  try {
    const raw = localStorage.getItem(SHIFTS_KEY);
    if (!raw) {
      const initial = getInitialShifts();
      saveShifts(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load shifts from localStorage:', e);
    return getInitialShifts();
  }
}

export function saveShifts(shifts: HospitalShift[]): void {
  try {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  } catch (e) {
    console.error('Failed to save shifts:', e);
  }
}

export function loadTasks(): DutyTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) {
      const initial = getInitialTasks();
      saveTasks(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load tasks from localStorage:', e);
    return getInitialTasks();
  }
}

export function saveTasks(tasks: DutyTask[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
}

export function loadLogs(): FingerprintLogEntry[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) {
      const initial = getInitialLogs();
      saveLogs(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load logs from localStorage:', e);
    return getInitialLogs();
  }
}

export function saveLogs(logs: FingerprintLogEntry[]): void {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs:', e);
  }
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      saveProfile(DEFAULT_USER_PROFILE);
      return DEFAULT_USER_PROFILE;
    }
    return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to load profile:', e);
    return DEFAULT_USER_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile:', e);
  }
}
