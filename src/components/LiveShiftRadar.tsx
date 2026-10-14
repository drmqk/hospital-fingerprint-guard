import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Fingerprint,
  Clock,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  LogIn,
  LogOut,
} from 'lucide-react';
import { HospitalShift, UserProfile } from '../types';
import { audioAlarm } from '../services/audioAlarm';
import { NotificationService } from '../services/notificationService';
import { formatHMTo12 } from '../utils/timeFormat';
import { Language, translations } from '../utils/i18n';

interface LiveShiftRadarProps {
  shifts: HospitalShift[];
  profile: UserProfile;
  onRecordFingerprint: (shiftId: string, type: 'in' | 'out') => void;
  onAddNewShift: () => void;
  language?: Language;
}

export const LiveShiftRadar: React.FC<LiveShiftRadarProps> = ({
  shifts,
  profile,
  onRecordFingerprint,
  onAddNewShift,
  language = profile.language || 'en',
}) => {
  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';

  const [now, setNow] = useState<Date>(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // User-selected biometric punch mode ('in' | 'out')
  const [selectedPunchMode, setSelectedPunchMode] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current active shift or upcoming shift
  const parseShiftDate = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}:00`);
  };

  // Find shift that is ongoing right now
  const activeShift = shifts.find((shift) => {
    const start = parseShiftDate(shift.startDate, shift.startTime);
    const end = parseShiftDate(shift.endDate, shift.endTime);
    return now >= start && now <= end;
  });

  // Find next upcoming shift
  const upcomingShift = shifts
    .filter((shift) => {
      const start = parseShiftDate(shift.startDate, shift.startTime);
      return start > now;
    })
    .sort((a, b) => {
      return parseShiftDate(a.startDate, a.startTime).getTime() - parseShiftDate(b.startDate, b.startTime).getTime();
    })[0];

  const currentOrNext = activeShift || upcomingShift;

  const isClockInDone = currentOrNext?.fingerprintInStatus === 'clocked_in';
  const isClockOutDone = currentOrNext?.fingerprintOutStatus === 'clocked_out';
  const stationName = currentOrNext?.fingerprintStation || profile.defaultFingerprintStation;

  // Auto-switch default mode based on status
  useEffect(() => {
    if (currentOrNext) {
      if (!isClockInDone) {
        setSelectedPunchMode('in');
      } else if (!isClockOutDone) {
        setSelectedPunchMode('out');
      }
    }
  }, [currentOrNext?.id, isClockInDone, isClockOutDone]);

  // Target time based on user-selected punch mode
  let targetTime: Date | null = null;
  if (currentOrNext) {
    if (selectedPunchMode === 'in') {
      targetTime = parseShiftDate(currentOrNext.startDate, currentOrNext.startTime);
    } else {
      targetTime = parseShiftDate(currentOrNext.endDate, currentOrNext.endTime);
    }
  }

  // Calculate countdown
  let timeDiffMs = targetTime ? targetTime.getTime() - now.getTime() : 0;
  const isTargetPast = timeDiffMs < 0;
  const absDiffSec = Math.floor(Math.abs(timeDiffMs) / 1000);
  const diffHours = Math.floor(absDiffSec / 3600);
  const diffMinutes = Math.floor((absDiffSec % 3600) / 60);
  const diffSeconds = absDiffSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const countdownString = `${pad(diffHours)}:${pad(diffMinutes)}:${pad(diffSeconds)}`;

  // Handle fingerprint button tap (either from sensor pad or direct button)
  const triggerPunch = (type: 'in' | 'out') => {
    if (!currentOrNext) return;

    setIsScanning(true);
    audioAlarm.playTone('radar_pulse', 0.9);

    setTimeout(() => {
      setIsScanning(false);
      onRecordFingerprint(currentOrNext.id, type);

      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#3b82f6'],
        });
      } catch (e) {
        // ignore if canvas unavailable
      }

      const actionText = type === 'in' ? (language === 'ar' ? 'حضور' : 'Clock-In') : (language === 'ar' ? 'انصراف' : 'Clock-Out');
      setScanSuccessMessage(
        language === 'ar'
          ? `تم توثيق بصمة ${actionText} بنجاح في ${stationName}!`
          : `Biometric ${actionText} Verified at ${stationName}!`
      );
      setTimeout(() => setScanSuccessMessage(null), 5000);

      NotificationService.notify(
        language === 'ar' ? `تم توثيق بصمة ${actionText}` : `Fingerprint ${actionText} Verified`,
        language === 'ar'
          ? `تم تسجيل الحضور في ${stationName}. تم تحديث سجل الامتثال.`
          : `Attendance recorded at ${stationName}. Compliance record updated.`,
        { sound: 'radar_pulse' }
      );
    }, 1000);
  };

  const isCurrentModeVerified = selectedPunchMode === 'in' ? isClockInDone : isClockOutDone;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-7 text-white ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background medical glow & grid lines */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        
        {/* Top Header Row: Status Bar & Shift Name */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {activeShift
                ? (language === 'ar' ? 'في النوبتجية الآن (قيد العمل)' : 'Currently On Shift')
                : upcomingShift
                ? (language === 'ar' ? 'النوبتجية القادمة التالية' : 'Next Scheduled Shift')
                : (language === 'ar' ? 'لا توجد نوبتجيات مجدولة' : 'No Scheduled Shifts')}
            </div>

            {currentOrNext && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {currentOrNext.department}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              {language === 'ar' ? 'التنبيهات التلقائية: نشطة' : 'Automated Notifications: Active'}
            </span>
          </div>
        </div>

        {/* Main Content Grid: Radar Details vs Biometric Action */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
          
          {/* Left Column: Shift Information & Both Shift In / Out Details */}
          <div className="lg:col-span-7 space-y-4">
            {currentOrNext ? (
              <>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    {currentOrNext.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-300">
                    <span className="flex items-center gap-1.5 font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {currentOrNext.startDate} ({formatHMTo12(currentOrNext.startTime)}) ➔ {currentOrNext.endDate} ({formatHMTo12(currentOrNext.endTime)})
                    </span>
                    <span className="flex items-center gap-1 text-slate-300 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {currentOrNext.hospitalName}
                    </span>
                    {currentOrNext.locationDetails && (
                      <span className="text-xs text-slate-400">({currentOrNext.locationDetails})</span>
                    )}
                    {currentOrNext.missedMinutes && currentOrNext.missedMinutes > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        {language === 'ar' ? `وقت مفقود: ${currentOrNext.missedMinutes} دقيقة` : `Missed Time: ${currentOrNext.missedMinutes} mins`}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Biometric Station Details Card with Dual Shift In and Shift Out Controls */}
                <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Fingerprint className="w-4 h-4 text-cyan-400" />
                      {language === 'ar' ? 'محطة البصمة المعتمدة:' : 'Designated Biometric Station:'}
                    </span>
                    <span className="text-cyan-300 font-semibold">{stationName}</span>
                  </div>

                  {/* PROMINENT DUAL SHIFT IN & SHIFT OUT CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    
                    {/* 1. Shift In (Clock-In) Card */}
                    <div className={`p-3 rounded-xl border transition ${
                      isClockInDone
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : selectedPunchMode === 'in'
                        ? 'bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                          {t.shiftIn}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-300">
                          {formatHMTo12(currentOrNext.startTime)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mb-2">
                        {language === 'ar'
                          ? `نافذة الحضور: ±${currentOrNext.fingerprintInWindowMinutes} دقيقة`
                          : `Window: ±${currentOrNext.fingerprintInWindowMinutes}m`}
                      </div>

                      {isClockInDone ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {language === 'ar'
                              ? `تم الحضور (${currentOrNext.fingerprintInTimestamp?.split('T')[1]?.substring(0, 5) || 'مسجل'})`
                              : `Verified In (${currentOrNext.fingerprintInTimestamp?.split('T')[1]?.substring(0, 5) || 'Done'})`}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPunchMode('in');
                            triggerPunch('in');
                          }}
                          disabled={isScanning}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition active:scale-95"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          {t.punchIn}
                        </button>
                      )}
                    </div>

                    {/* 2. Shift Out (Clock-Out) Card */}
                    <div className={`p-3 rounded-xl border transition ${
                      isClockOutDone
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : selectedPunchMode === 'out'
                        ? 'bg-slate-900 border-blue-500/60 ring-1 ring-blue-500/30'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <LogOut className="w-3.5 h-3.5 text-blue-400" />
                          {t.shiftOut}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-300">
                          {formatHMTo12(currentOrNext.endTime)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mb-2">
                        {language === 'ar'
                          ? `نافذة الانصراف: +${currentOrNext.fingerprintOutWindowMinutes} دقيقة`
                          : `Window: +${currentOrNext.fingerprintOutWindowMinutes}m`}
                      </div>

                      {isClockOutDone ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {language === 'ar'
                              ? `تم الانصراف (${currentOrNext.fingerprintOutTimestamp?.split('T')[1]?.substring(0, 5) || 'مسجل'})`
                              : `Verified Out (${currentOrNext.fingerprintOutTimestamp?.split('T')[1]?.substring(0, 5) || 'Done'})`}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPunchMode('out');
                            triggerPunch('out');
                          }}
                          disabled={isScanning}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition active:scale-95"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          {t.punchOut}
                        </button>
                      )}
                    </div>

                  </div>

                  {currentOrNext.notes && (
                    <div className="text-xs text-slate-300 bg-slate-900/40 p-2 rounded border border-slate-800 italic">
                      " {currentOrNext.notes} "
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-6 text-center lg:text-left space-y-3">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'لا توجد نوبتجيات قادمة مجدولة' : 'No Upcoming Shift Scheduled'}
                </h3>
                <p className="text-sm text-slate-400">
                  {language === 'ar'
                    ? 'أضف نوبتجيتك لتفعيل تنبيهات البصمة التلقائية وحساب الأجر وساعات العمل فوراً.'
                    : 'Add your next hospital shift to automatically activate automated biometric fingerprint reminders and duty alarms.'}
                </p>
                <button
                  onClick={onAddNewShift}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-md transition"
                >
                  <Zap className="w-4 h-4" />
                  {language === 'ar' ? 'جدولة نوبتجية جديدة' : 'Schedule Hospital Shift'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Biometric Fingerprint Punch Pad with Shift In / Shift Out Tabs */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/60 border border-cyan-500/20 rounded-2xl relative">
            
            {scanSuccessMessage && (
              <div className="absolute top-2 left-2 right-2 z-20 bg-emerald-500/90 text-white text-xs font-semibold py-2 px-3 rounded-lg text-center shadow-lg animate-in fade-in flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {scanSuccessMessage}
              </div>
            )}

            {currentOrNext ? (
              <div className="text-center w-full space-y-3">
                
                {/* Punch Mode Selector Tabs: Shift In vs Shift Out */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedPunchMode('in')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedPunchMode === 'in'
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t.shiftIn}</span>
                    {isClockInDone && <CheckCircle className="w-3 h-3 text-emerald-300" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPunchMode('out')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedPunchMode === 'out'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.shiftOut}</span>
                    {isClockOutDone && <CheckCircle className="w-3 h-3 text-emerald-300" />}
                  </button>
                </div>

                {/* Countdown Timer Display */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl py-2 px-4 shadow-inner">
                  <div className="text-xs text-slate-400 mb-0.5">
                    {selectedPunchMode === 'in'
                      ? (language === 'ar' ? 'العد التنازلي لنافذة بصمة الحضور' : 'Countdown to Shift In Window')
                      : (language === 'ar' ? 'العد التنازلي لنافذة بصمة الانصراف' : 'Countdown to Shift Out Window')}
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-cyan-400 tracking-wider">
                    {countdownString}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'ar' ? 'الموعد المستهدف:' : 'Target:'} {targetTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>

                {/* Biometric Touch Scanner Button */}
                <div className="relative flex justify-center py-2">
                  <button
                    onClick={() => triggerPunch(selectedPunchMode)}
                    disabled={isScanning}
                    className={`group relative flex flex-col items-center justify-center w-28 h-28 rounded-full transition-all duration-300 shadow-xl ${
                      isScanning
                        ? 'bg-cyan-500 ring-8 ring-cyan-400/30 scale-95'
                        : isCurrentModeVerified
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:scale-105 ring-4 ring-emerald-500/20 active:scale-95'
                        : 'bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-500 hover:scale-105 ring-4 ring-cyan-500/20 active:scale-95'
                    }`}
                    title={language === 'ar' ? 'المس لتسجيل البصمة البيومترية' : 'Touch to verify biometric fingerprint scan'}
                  >
                    {/* Concentric Scanner Rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-40 pointer-events-none" />
                    <Fingerprint className={`w-14 h-14 text-white transition-transform ${isScanning ? 'scale-110 animate-pulse' : 'group-hover:scale-110'}`} />
                    
                    {isScanning && (
                      <span className="absolute bottom-2 text-[10px] font-bold text-white uppercase tracking-tighter">
                        {language === 'ar' ? 'جاري الفحص...' : 'Scanning...'}
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-300 font-medium">
                  {isScanning ? (
                    <span className="text-cyan-400 animate-pulse font-semibold">
                      {language === 'ar' ? 'جاري التحقق من حساس البصمة...' : 'Verifying Biometric Sensor...'}
                    </span>
                  ) : (
                    <span>
                      {language === 'ar' ? 'اضغط لتسجيل' : 'Tap to record'}{' '}
                      <strong>{selectedPunchMode === 'in' ? t.shiftIn : t.shiftOut}</strong>
                      {isCurrentModeVerified && (
                        <span className="text-emerald-400 font-semibold block text-[11px] mt-0.5">
                          ✓ {language === 'ar' ? 'مسجل مسبقاً (اضغط لإعادة التسجيل)' : 'Already recorded (tap to re-punch)'}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {language === 'ar' ? 'يسجل الطابع الزمني المباشر في كشف الامتثال' : 'Logs exact timestamp to attendance compliance sheet'}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-cyan-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-white">
                  {language === 'ar' ? 'رادار البصمة جاهز' : 'Biometric Radar Ready'}
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'ar'
                    ? 'سيتم تفعيل التنبيهات تلقائياً قبل موعد نوبتجيتك التالية.'
                    : 'Automatic alarms will trigger before your next shift window.'}
                </p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
