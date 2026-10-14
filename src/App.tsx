/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Fingerprint,
  Calendar,
  CalendarDays,
  Bell,
  ShieldCheck,
  Plus,
  Clock,
  Sparkles,
  Activity,
  AlertTriangle,
  Calculator,
  DollarSign,
} from 'lucide-react';
import { Header } from './components/Header';
import { LiveShiftRadar } from './components/LiveShiftRadar';
import { ShiftList } from './components/ShiftList';
import { ShiftModal } from './components/ShiftModal';
import { MonthPlanner } from './components/MonthPlanner';
import { MonthlyIncomeCalculator } from './components/MonthlyIncomeCalculator';
import { TasksAndAlarms } from './components/TasksAndAlarms';
import { TaskModal } from './components/TaskModal';
import { FingerprintComplianceLog } from './components/FingerprintComplianceLog';
import { GoogleCalendarSyncModal } from './components/GoogleCalendarSyncModal';
import { SettingsModal } from './components/SettingsModal';
import { ActiveAlarmModal } from './components/ActiveAlarmModal';
import {
  HospitalShift,
  DutyTask,
  FingerprintLogEntry,
  UserProfile,
  ActiveAlarmState,
} from './types';
import {
  loadShifts,
  saveShifts,
  loadTasks,
  saveTasks,
  loadLogs,
  saveLogs,
  loadProfile,
  saveProfile,
} from './utils/storage';
import { initAuth, getAccessToken } from './services/firebaseAuth';
import { syncShiftToGoogleCalendar } from './services/googleCalendar';
import { NotificationService } from './services/notificationService';
import { audioAlarm } from './services/audioAlarm';
import { formatHMTo12 } from './utils/timeFormat';
import { Language, translations } from './utils/i18n';

export default function App() {
  const [shifts, setShifts] = useState<HospitalShift[]>(() => loadShifts());
  const [tasks, setTasks] = useState<DutyTask[]>(() => loadTasks());
  const [logs, setLogs] = useState<FingerprintLogEntry[]>(() => loadLogs());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('hospital_guard_lang') as Language;
    if (saved === 'ar' || saved === 'en') return saved;
    return profile.language || 'en';
  });

  const [user, setUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  const [activeTab, setActiveTab] = useState<'radar' | 'shifts' | 'planner' | 'tasks' | 'compliance' | 'income'>('radar');

  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('hospital_guard_lang', language);
  }, [language]);

  const handleToggleLanguage = () => {
    const nextLang: Language = language === 'ar' ? 'en' : 'ar';
    setLanguage(nextLang);
    setProfile((prev) => ({ ...prev, language: nextLang }));
  };

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<HospitalShift | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<DutyTask | null>(null);

  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Emergency/Task Alarm State (rings alarm modal)
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmState | null>(null);
  const lastAlarmTriggerRef = useRef<{ [key: string]: number }>({});

  // 1. Initialize Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setUserToken(token || null);
      },
      () => {
        setUser(null);
        setUserToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Persist state changes
  useEffect(() => {
    saveShifts(shifts);
  }, [shifts]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // 3. Automated Duty & Fingerprint Notification Watcher Loop
  useEffect(() => {
    const watcher = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMins = currentHours * 60 + currentMinutes;

      // Check upcoming shift reminders
      shifts.forEach((shift) => {
        if (shift.startDate !== todayStr) return;

        const [startH, startM] = shift.startTime.split(':').map(Number);
        const shiftStartInMins = startH * 60 + startM;
        const diffInMins = shiftStartInMins - currentTimeInMins;

        const reminders = shift.remindersMinutesBefore || [60, 30, 15, 0];
        const notified = shift.lastNotifiedReminders || [];

        reminders.forEach((r) => {
          // Trigger when within 1 minute of threshold
          if (diffInMins <= r && diffInMins >= r - 1 && !notified.includes(r)) {
            const timeDesc = r === 0 ? 'starting RIGHT NOW' : `starts in ${r} minutes`;
            NotificationService.notify(
              `🏥 Shift Reminder: ${shift.title}`,
              `Your ${shift.department} shift ${timeDesc}. Biometric attendance required at ${shift.fingerprintStation}.`,
              {
                sound: 'hospital_pager',
                requireInteraction: true,
              }
            );

            // Update notified list
            setShifts((prev) =>
              prev.map((s) =>
                s.id === shift.id
                  ? { ...s, lastNotifiedReminders: [...(s.lastNotifiedReminders || []), r] }
                  : s
              )
            );
          }
        });

        // Check if mandatory fingerprint clock-in window is active
        if (
          shift.fingerprintInRequired &&
          shift.fingerprintInStatus === 'pending' &&
          diffInMins <= 5 &&
          diffInMins >= -shift.fingerprintInWindowMinutes
        ) {
          const alarmKey = `fp-in-${shift.id}`;
          const lastTrigger = lastAlarmTriggerRef.current[alarmKey] || 0;
          // Trigger once every 8 minutes if still pending
          if (Date.now() - lastTrigger > 8 * 60 * 1000) {
            lastAlarmTriggerRef.current[alarmKey] = Date.now();
            setActiveAlarm({
              id: `alarm-${Date.now()}`,
              title: `Fingerprint Clock-In Required: ${shift.title}`,
              subtitle: `Window is currently open at ${shift.fingerprintStation}. Record your biometric scan to avoid attendance penalty.`,
              type: 'fingerprint_in',
              referenceId: shift.id,
              priority: 'urgent',
              soundType: 'hospital_pager',
              timestamp: new Date().toISOString(),
            });

            NotificationService.notify(
              '⚠️ Urgent: Fingerprint Clock-In Open',
              `Please report to ${shift.fingerprintStation} for shift attendance verification.`,
              { sound: 'hospital_pager' }
            );
          }
        }
      });

      // Check task alarms
      tasks.forEach((task) => {
        if (task.completed || !task.alarmEnabled) return;
        if (task.dueDate !== todayStr) return;

        // Check snooze
        if (task.snoozedUntil && new Date(task.snoozedUntil) > now) return;

        const [dueH, dueM] = task.dueTime.split(':').map(Number);
        const taskDueInMins = dueH * 60 + dueM;

        if (currentTimeInMins >= taskDueInMins && !task.alarmTriggered) {
          const alarmKey = `task-${task.id}`;
          const lastTrigger = lastAlarmTriggerRef.current[alarmKey] || 0;
          if (Date.now() - lastTrigger > 5 * 60 * 1000) {
            lastAlarmTriggerRef.current[alarmKey] = Date.now();

            setActiveAlarm({
              id: `task-alarm-${task.id}`,
              title: task.title,
              subtitle: `${task.patientRoomOrBed ? `Location: ${task.patientRoomOrBed} • ` : ''}${task.notes || 'Clinical task due now'}`,
              type: 'duty_task',
              referenceId: task.id,
              priority: task.priority,
              soundType: task.alarmSound,
              timestamp: new Date().toISOString(),
            });

            NotificationService.notify(
              `🔔 Clinical Task Alarm: ${task.title}`,
              task.notes || 'Scheduled clinical duty requires immediate attention.',
              { sound: task.alarmSound, requireInteraction: true }
            );
          }
        }
      });
    }, 10000);

    return () => clearInterval(watcher);
  }, [shifts, tasks]);

  // Biometric Fingerprint Punch Handler
  const handleRecordFingerprint = async (shiftId: string, type: 'in' | 'out') => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const now = new Date();
    const nowStr = now.toISOString();
    const is12h = (profile.timeFormat || '12h') === '12h';
    const timeFormatted = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: is12h,
    });
    const dateFormatted = now.toISOString().split('T')[0];

    // Compute difference in minutes from scheduled time
    const schedTime12 = is12h ? formatHMTo12(type === 'in' ? shift.startTime : shift.endTime) : (type === 'in' ? shift.startTime : shift.endTime);
    const scheduledTimeStr = `${type === 'in' ? shift.startDate : shift.endDate} ${schedTime12}`;
    const scheduledDate = new Date(type === 'in' ? `${shift.startDate}T${shift.startTime}:00` : `${shift.endDate}T${shift.endTime}:00`);
    const diffMs = now.getTime() - scheduledDate.getTime();
    const diffMins = Math.round(diffMs / 60000);

    let status: 'on_time' | 'grace_period' | 'late' = 'on_time';
    const allowedWindow = type === 'in' ? shift.fingerprintInWindowMinutes : shift.fingerprintOutWindowMinutes;

    if (diffMins > allowedWindow) {
      status = 'late';
    } else if (diffMins > 0) {
      status = 'grace_period';
    }

    const newLog: FingerprintLogEntry = {
      id: `log-${Date.now()}`,
      shiftId: shift.id,
      shiftTitle: shift.title,
      hospitalName: shift.hospitalName,
      department: shift.department,
      station: shift.fingerprintStation,
      type,
      scheduledTime: scheduledTimeStr,
      actualTimestamp: `${dateFormatted} ${timeFormatted}`,
      status,
      differenceMinutes: diffMins,
      notes: `Biometric scan verified at ${shift.fingerprintStation}. Fingerprint punch #${logs.length + 1043}`,
    };

    setLogs((prev) => [newLog, ...prev]);

    // Update shift status
    const updatedShift: HospitalShift = {
      ...shift,
      fingerprintInStatus: type === 'in' ? 'clocked_in' : shift.fingerprintInStatus,
      fingerprintOutStatus: type === 'out' ? 'clocked_out' : shift.fingerprintOutStatus,
      fingerprintInTimestamp: type === 'in' ? nowStr : shift.fingerprintInTimestamp,
      fingerprintOutTimestamp: type === 'out' ? nowStr : shift.fingerprintOutTimestamp,
    };

    setShifts((prev) => prev.map((s) => (s.id === shift.id ? updatedShift : s)));

    // Dismiss any active alarm related to this shift
    if (activeAlarm && activeAlarm.referenceId === shift.id) {
      setActiveAlarm(null);
      audioAlarm.stopAlarm();
    }

    // Auto-sync with Google Calendar if connected
    if (userToken && shift.googleCalendarEventId) {
      try {
        await syncShiftToGoogleCalendar(updatedShift);
      } catch (e) {
        console.warn('Silent calendar update error:', e);
      }
    }
  };

  // Alarm Modal Handlers
  const handleDismissAlarm = () => {
    setActiveAlarm(null);
    audioAlarm.stopAlarm();
  };

  const handleSnoozeAlarm = (minutes: number) => {
    if (!activeAlarm) return;
    const snoozeUntil = new Date(Date.now() + minutes * 60000).toISOString();

    if (activeAlarm.type === 'duty_task') {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeAlarm.referenceId ? { ...t, snoozedUntil: snoozeUntil } : t))
      );
    }
    setActiveAlarm(null);
    audioAlarm.stopAlarm();
  };

  const handleAlarmActionComplete = () => {
    if (!activeAlarm) return;

    if (activeAlarm.type === 'duty_task') {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeAlarm.referenceId
            ? { ...t, completed: true, completedAt: new Date().toISOString() }
            : t
        )
      );
    } else if (activeAlarm.type === 'fingerprint_in' || activeAlarm.type === 'fingerprint_out') {
      const type = activeAlarm.type === 'fingerprint_in' ? 'in' : 'out';
      handleRecordFingerprint(activeAlarm.referenceId, type);
    }

    setActiveAlarm(null);
    audioAlarm.stopAlarm();
  };

  // Shift & Task CRUD Handlers
  const handleSaveShift = async (shift: HospitalShift) => {
    setShifts((prev) => {
      const exists = prev.some((s) => s.id === shift.id);
      return exists ? prev.map((s) => (s.id === shift.id ? shift : s)) : [shift, ...prev];
    });

    // If connected to Google Calendar, ask or auto-sync
    if (userToken && profile.autoSyncGoogleCalendar) {
      try {
        setIsSyncingCalendar(true);
        const eventId = await syncShiftToGoogleCalendar(shift);
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shift.id ? { ...s, googleCalendarEventId: eventId, lastSyncedWithGoogle: new Date().toISOString() } : s
          )
        );
      } catch (e) {
        console.error('Failed auto-sync shift to Google Calendar:', e);
      } finally {
        setIsSyncingCalendar(false);
      }
    }
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
  };

  const handleSaveTask = (task: DutyTask) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev];
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  };

  const handleImportShifts = (newShifts: HospitalShift[]) => {
    setShifts((prev) => [...newShifts, ...prev]);
  };

  const handleApplyWeekShifts = (newShifts: HospitalShift[]) => {
    setShifts((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const filtered = newShifts.filter((s) => !existingIds.has(s.id));
      return [...filtered, ...prev];
    });
  };

  const handleUpdateShift = (updatedShift: HospitalShift) => {
    setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
  };

  const totalMissedMinutesAll = shifts.reduce((acc, s) => acc + (s.missedMinutes || 0), 0);
  const pendingUrgentTasksCount = tasks.filter((t) => !t.completed && t.priority === 'urgent').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* App Header */}
      <Header
        user={user}
        userToken={userToken}
        onAuthChange={(u, token) => {
          setUser(u);
          setUserToken(token);
        }}
        profile={profile}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
        isSyncingCalendar={isSyncingCalendar}
        activeAlarmsCount={pendingUrgentTasksCount}
        onToggleTimeFormat={() =>
          setProfile((prev) => ({
            ...prev,
            timeFormat: (prev.timeFormat || '12h') === '12h' ? '24h' : '12h',
          }))
        }
        language={language}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'radar'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              {t.tabRadar}
            </button>

            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'planner'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              {t.tabMonthPlanner}
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                {language === 'ar' ? 'شهر كامل' : 'Month'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shifts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'shifts'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t.tabShifts} ({shifts.length})
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'tasks'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              {t.tabTasks} ({tasks.filter((t) => !t.completed).length})
              {pendingUrgentTasksCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'compliance'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              {t.tabCompliance} ({logs.length})
            </button>

            <button
              onClick={() => setActiveTab('income')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              {t.tabIncome}
              {totalMissedMinutesAll > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  -{totalMissedMinutesAll}m
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('planner')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {language === 'ar' ? 'مخطط الشهر' : 'Auto Month Planner'}
            </button>

            <button
              onClick={() => {
                setShiftToEdit(null);
                setIsShiftModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Add Shift
            </button>

            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" />
              Add Task Alarm
            </button>
          </div>
        </div>

        {/* Tab 1: Duty Radar & Punch Pad */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <LiveShiftRadar
              shifts={shifts}
              profile={profile}
              onRecordFingerprint={handleRecordFingerprint}
              onAddNewShift={() => {
                setShiftToEdit(null);
                setIsShiftModalOpen(true);
              }}
              language={language}
            />

            {/* Quick Two-Column View on Radar: Upcoming Shifts & Active Task Alarms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Quick Shift Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Next Scheduled Duties
                  </h3>
                  <button
                    onClick={() => setActiveTab('shifts')}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {shifts.slice(0, 3).map((shift) => (
                    <div
                      key={shift.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">{shift.title}</div>
                        <div className="text-slate-400 flex items-center gap-2">
                          <span className="font-mono text-cyan-300">
                            {shift.startDate} ({shift.startTime} - {shift.endTime})
                          </span>
                          <span>• {shift.department}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Shift In badge / punch */}
                        <div className="flex flex-col items-end gap-1">
                          {shift.fingerprintInStatus === 'clocked_in' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                              ✓ {t.shiftInVerified}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRecordFingerprint(shift.id, 'in')}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition"
                            >
                              + {t.shiftIn}
                            </button>
                          )}

                          {/* Shift Out badge / punch */}
                          {shift.fingerprintOutStatus === 'clocked_out' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                              ✓ {t.shiftOutVerified}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRecordFingerprint(shift.id, 'out')}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold transition"
                            >
                              + {t.shiftOut}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: High Priority Task Alarms */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-400" />
                    Pending Clinical Duty Alarms
                  </h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs text-red-400 hover:underline font-semibold"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  {tasks
                    .filter((t) => !t.completed)
                    .slice(0, 3)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {task.title}
                            {task.priority === 'urgent' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500 text-white font-bold">
                                URGENT
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 flex items-center gap-2 font-mono text-cyan-300">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {task.dueDate} at {task.dueTime}
                            {task.patientRoomOrBed && (
                              <span className="text-slate-400 font-sans">({task.patientRoomOrBed})</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleTaskComplete(task.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] transition"
                        >
                          Mark Done
                        </button>
                      </div>
                    ))}

                  {tasks.filter((t) => !t.completed).length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      All clinical duties and task alarms completed for today!
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab: Automated Month Planner with Desired End Time & Half Cycles */}
        {activeTab === 'planner' && (
          <MonthPlanner
            profile={profile}
            onApplyMonthShifts={handleApplyWeekShifts}
            onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            isCalendarConnected={Boolean(user && userToken)}
            language={language}
          />
        )}

        {/* Tab 2: Hospital Shifts */}
        {activeTab === 'shifts' && (
          <ShiftList
            shifts={shifts}
            onAddNewShift={() => {
              setShiftToEdit(null);
              setIsShiftModalOpen(true);
            }}
            onEditShift={(shift) => {
              setShiftToEdit(shift);
              setIsShiftModalOpen(true);
            }}
            onDeleteShift={handleDeleteShift}
            onRecordFingerprint={handleRecordFingerprint}
            onSyncShiftToCalendar={() => setIsCalendarSyncOpen(true)}
            language={language}
          />
        )}

        {/* Tab 3: Duty Tasks & Alarms */}
        {activeTab === 'tasks' && (
          <TasksAndAlarms
            tasks={tasks}
            onAddNewTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onToggleTaskComplete={handleToggleTaskComplete}
          />
        )}

        {/* Tab 4: Fingerprint Compliance Log */}
        {activeTab === 'compliance' && <FingerprintComplianceLog logs={logs} />}

        {/* Tab 5: Monthly Income & Missed Time Calculator */}
        {activeTab === 'income' && (
          <MonthlyIncomeCalculator
            shifts={shifts}
            logs={logs}
            profile={profile}
            onUpdateShift={handleUpdateShift}
            onUpdateProfile={setProfile}
            language={language}
          />
        )}

      </main>

      {/* Persistent Emergency / Duty Task Alarm Modal */}
      <ActiveAlarmModal
        alarm={activeAlarm}
        onDismiss={handleDismissAlarm}
        onSnooze={handleSnoozeAlarm}
        onActionComplete={handleAlarmActionComplete}
      />

      {/* Shift Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setShiftToEdit(null);
        }}
        onSaveShift={handleSaveShift}
        shiftToEdit={shiftToEdit}
        profile={profile}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSaveTask={handleSaveTask}
        taskToEdit={taskToEdit}
        shifts={shifts}
      />

      {/* Google Calendar Sync Modal */}
      <GoogleCalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        shifts={shifts}
        onUpdateShift={(updated) => {
          setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }}
        onImportShifts={handleImportShifts}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={(updated) => setProfile(updated)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Hospital Duty &amp; Fingerprint Alarm Guard • Synchronized with Google Calendar
      </footer>
    </div>
  );
}
