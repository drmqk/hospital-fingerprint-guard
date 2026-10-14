import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Clock,
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Zap,
  Coffee,
  Calendar,
  Building2,
  RefreshCw,
  PlusCircle,
  Repeat,
  Layers,
  Minus,
  Plus,
  AlertTriangle,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';
import {
  HospitalShift,
  UserProfile,
  ShiftDurationOption,
  MonthPlannerConfig,
  RotationCycle,
} from '../types';
import {
  generateMonthRotationCycles,
  generateMonthRotationSeries,
  getDefaultMonthConfig,
  formatDateYMD,
  getLastDateOfMonth,
  getPlanCutoffDate,
} from '../utils/monthPlannerGenerator';
import { formatHMTo12, formatTime } from '../utils/timeFormat';
import { Language, translations } from '../utils/i18n';
import { NotificationService } from '../services/notificationService';
import { audioAlarm } from '../services/audioAlarm';

interface MonthPlannerProps {
  profile: UserProfile;
  onApplyMonthShifts: (shifts: HospitalShift[]) => void;
  onOpenCalendarSync: () => void;
  isCalendarConnected: boolean;
  language?: Language;
}

export const MonthPlanner: React.FC<MonthPlannerProps> = ({
  profile,
  onApplyMonthShifts,
  onOpenCalendarSync,
  isCalendarConnected,
  language = profile.language || 'en',
}) => {
  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';

  const [config, setConfig] = useState<MonthPlannerConfig>(() =>
    getDefaultMonthConfig(
      24,
      profile.hospitalName,
      profile.defaultDepartment,
      profile.defaultFingerprintStation
    )
  );

  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // View mode switcher: 'calendar' (Full Month Visual Calendar) vs 'cycles' (Detailed Cycle List)
  const [plannerViewMode, setPlannerViewMode] = useState<'calendar' | 'cycles'>('calendar');

  // Month navigation for calendar view
  const [calendarDisplayMonth, setCalendarDisplayMonth] = useState<string>(() => {
    return config.targetMonth || config.startDate.slice(0, 7);
  });

  // Keep calendar month in sync when config.targetMonth changes
  React.useEffect(() => {
    if (config.targetMonth) {
      setCalendarDisplayMonth(config.targetMonth);
    }
  }, [config.targetMonth]);

  // Generate continuous rotation series in real time with desired end time & incomplete cycle handling
  const seriesData = useMemo(() => {
    return generateMonthRotationSeries(config, language);
  }, [config, language]);

  const {
    cycles,
    seriesStartDateFormatted,
    seriesEndDateFormatted,
    seriesEndDateWorkFormatted,
    totalDutyHours: totalWorkHours,
    totalRestHours,
    totalBiometricPunches,
    totalDaysSpan,
    hasIncompleteCycle,
    targetCutoffFormatted,
    targetCutoffIso,
  } = seriesData;

  const totalShiftsCount = cycles.reduce((acc, c) => acc + c.shifts.length, 0);

  // Derive target month key and boundary dates
  const currentMonthKey = config.targetMonth || config.startDate.slice(0, 7);
  const [currentYearNum, currentMonthNum] = currentMonthKey.split('-').map(Number);
  const daysInConfigMonth = new Date(currentYearNum, currentMonthNum, 0).getDate();
  const lastDayOfConfigMonthStr = `${currentMonthKey}-${String(daysInConfigMonth).padStart(2, '0')}`;
  const firstDayOfConfigMonthStr = `${currentMonthKey}-01`;

  // Handler for changing target month (automatically aligns start and end dates within that month)
  const handleTargetMonthChange = (newMonth: string) => {
    if (!newMonth) return;
    const [y, m] = newMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const lastDayStr = `${newMonth}-${String(lastDay).padStart(2, '0')}`;
    const firstDayStr = `${newMonth}-01`;

    setConfig((prev) => ({
      ...prev,
      targetMonth: newMonth,
      startDate: firstDayStr,
      desiredEndDate: lastDayStr,
    }));
    setCalendarDisplayMonth(newMonth);
  };

  // Quick same-month day preset (e.g. Day 15, Day 25, or Last Day of Month)
  const setPresetSameMonthDay = (dayNum: number, timeStr: string = '20:00') => {
    const targetM = config.targetMonth || config.startDate.slice(0, 7);
    const [y, m] = targetM.split('-').map(Number);
    const maxDay = new Date(y, m, 0).getDate();
    const clampedDay = Math.min(dayNum, maxDay);
    const dateStr = `${targetM}-${String(clampedDay).padStart(2, '0')}`;
    setConfig((prev) => ({
      ...prev,
      desiredEndDate: dateStr,
      desiredEndTime: timeStr,
    }));
  };

  const setPresetEndOfMonthTime = (timeStr: string = '20:00') => {
    const targetM = config.targetMonth || config.startDate.slice(0, 7);
    const [y, m] = targetM.split('-').map(Number);
    const maxDay = new Date(y, m, 0).getDate();
    const dateStr = `${targetM}-${String(maxDay).padStart(2, '0')}`;
    setConfig((prev) => ({
      ...prev,
      desiredEndDate: dateStr,
      desiredEndTime: timeStr,
    }));
  };

  // Quick End Date Presets
  const setPresetEndDate = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    setConfig((prev) => ({
      ...prev,
      desiredEndDate: formatDateYMD(target),
    }));
  };

  const setPresetEndOfMonth = () => {
    setPresetEndOfMonthTime('20:00');
  };

  const handleSelectDuration = (duration: ShiftDurationOption) => {
    setConfig((prev) => ({
      ...prev,
      shiftDuration: duration,
      restHours: 6,
      autoDivide24h: true,
      enforce6hRest: true,
    }));
  };

  const handleCommitSchedule = () => {
    const allShiftsToApply: HospitalShift[] = [];
    cycles.forEach((cycle) => {
      cycle.shifts.forEach((s) => allShiftsToApply.push(s));
    });

    if (allShiftsToApply.length === 0) {
      alert(language === 'ar' ? 'يرجى تهيئة دورة نوبتجية واحدة على الأقل.' : 'Please configure at least one duty cycle.');
      return;
    }

    onApplyMonthShifts(allShiftsToApply);
    setAppliedSuccess(true);
    audioAlarm.playTone('radar_pulse', profile.alarmVolume);

    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'],
      });
    } catch (e) {
      // safe fallback
    }

    NotificationService.notify(
      language === 'ar' ? 'تم تطبيق جدول نوبتجيات الشهر' : 'Month Rotation Schedule Applied',
      language === 'ar'
        ? `تم جدولة ${allShiftsToApply.length} وردية بنجاح حتى ${seriesEndDateFormatted || config.desiredEndDate}.`
        : `Successfully generated ${allShiftsToApply.length} duty shifts through ${seriesEndDateFormatted}.`,
      { sound: 'chime_alert' }
    );

    setTimeout(() => setAppliedSuccess(false), 5000);
  };

  // Build 7-column calendar matrix data for Full Month Calendar Plan
  const calendarData = useMemo(() => {
    const monthStr = calendarDisplayMonth || config.targetMonth || config.startDate.slice(0, 7);
    const [year, month] = monthStr.split('-').map(Number);
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month, 0).getDate();

    const allShifts = cycles.flatMap((c) => c.shifts);

    const monthDateObj = new Date(year, month - 1, 1);
    const monthTitle = monthDateObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });

    const cells: {
      type: 'empty' | 'day';
      dateStr?: string;
      dayNum?: number;
      dayName?: string;
      shifts?: HospitalShift[];
      isToday?: boolean;
    }[] = [];

    // Empty padding slots before first day
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: 'empty' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayShifts = allShifts.filter((s) => s.startDate === dateStr);
      const dayDate = new Date(year, month - 1, d);
      const dayName = dayDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'short',
      });

      cells.push({
        type: 'day',
        dateStr,
        dayNum: d,
        dayName,
        shifts: dayShifts,
        isToday: dateStr === todayStr,
      });
    }

    return { year, month, monthTitle, cells };
  }, [calendarDisplayMonth, config.targetMonth, config.startDate, cycles, language]);

  // Navigate calendar month
  const handlePrevMonth = () => {
    const [y, m] = calendarDisplayMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setCalendarDisplayMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = calendarDisplayMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setCalendarDisplayMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const weekDayHeaders = language === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                {t.monthPlannerTitle}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                  {language === 'ar' ? 'روتيشن مستمر' : 'Continuous Rotation'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {t.monthPlannerSub}
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Sync Shortcut */}
        <div className="flex items-center gap-2">
          {isCalendarConnected ? (
            <span className="text-xs px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              {t.notificationsActive}
            </span>
          ) : (
            <button
              onClick={onOpenCalendarSync}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition font-semibold"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {t.syncCalendar}
            </button>
          )}
        </div>
      </div>

      {appliedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong className="block font-bold">
              {language === 'ar' ? 'تم تطبيق وحفظ روتيشن الشهر بنجاح!' : 'Month Duty Schedule Applied!'}
            </strong>
            <span>
              {language === 'ar'
                ? `تمت جدولة ${totalShiftsCount} وردية مع تنبيهات البصمة وخصومات دقائق التأخير حتى ${seriesEndDateFormatted}.`
                : `Populated ${totalShiftsCount} hospital shifts through ${seriesEndDateFormatted}. Biometric alarms are now live.`}
            </span>
          </div>
        </div>
      )}

      {/* Choose Duty Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
            <Clock className="w-4 h-4 text-cyan-400" />
            {t.step1Title}
          </h4>
          <p className="text-xs text-slate-400">
            {t.step1Desc}
          </p>
        </div>

        {/* 3 Duration Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 24-Hour Duty */}
          <div
            onClick={() => handleSelectDuration(24)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              config.shiftDuration === 24
                ? 'bg-gradient-to-br from-cyan-950/60 to-slate-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                24 {language === 'ar' ? 'ساعة نوبتجية' : 'Hours Duty'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {language === 'ar' ? 'النظام الشائع' : 'Hospital Standard'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              {t.duration24h}
            </p>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <Coffee className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? '+ 6 ساعات راحة إجبارية' : '+ 6h Mandatory Rest'}</span>
            </div>
          </div>

          {/* 18-Hour Duty */}
          <div
            onClick={() => handleSelectDuration(18)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              config.shiftDuration === 18
                ? 'bg-gradient-to-br from-purple-950/60 to-slate-900 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                18 {language === 'ar' ? 'ساعة نوبتجية' : 'Hours Duty'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              {t.duration18h}
            </p>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <Coffee className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? '+ 6 ساعات راحة إجبارية' : '+ 6h Mandatory Rest'}</span>
            </div>
          </div>

          {/* 12-Hour Duty */}
          <div
            onClick={() => handleSelectDuration(12)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              config.shiftDuration === 12
                ? 'bg-gradient-to-br from-blue-950/60 to-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                12 {language === 'ar' ? 'ساعة نوبتجية' : 'Hours Duty'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              {t.duration12h}
            </p>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <Coffee className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? '+ 6 ساعات راحة إجبارية' : '+ 6h Mandatory Rest'}</span>
            </div>
          </div>
        </div>

        {/* Mandatory 6h rest explanation */}
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.mandatory6hRestNote}</span>
        </div>
      </div>

      {/* Set Dates & End Time */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
            <Calendar className="w-4 h-4 text-cyan-400" />
            {t.step2Title}
          </h4>
          <p className="text-xs text-slate-400">
            {t.step2Desc}
          </p>
        </div>

        {/* Planning Scope Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, planningScope: 'full_month' }))}
            className={`p-3 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
              config.planningScope === 'full_month'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <div>{t.modeFullMonth}</div>
              <div className="text-[10px] font-normal text-slate-400">
                {language === 'ar' ? 'كامل الشهر' : 'Whole month'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, planningScope: 'desired_end_time' }))}
            className={`p-3 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
              config.planningScope === 'desired_end_time'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div>{t.modeDesiredEndTime}</div>
              <div className="text-[10px] font-normal text-slate-400">
                {language === 'ar' ? 'موعد نهاية مخصص' : 'Custom cutoff'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, planningScope: 'cycle_count' }))}
            className={`p-3 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
              config.planningScope === 'cycle_count'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <div>{t.modeCycleCount}</div>
              <div className="text-[10px] font-normal text-slate-400">
                {language === 'ar' ? 'بعدد الدورات' : 'Cycle count'}
              </div>
            </div>
          </button>
        </div>

        {/* Dynamic Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          
          {/* Card 1: Selected Month & Start Date / Time */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                {t.targetMonthLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {daysInConfigMonth} {language === 'ar' ? 'يوماً' : 'Days'}
              </span>
            </div>
            
            <input
              type="month"
              value={currentMonthKey}
              onChange={(e) => handleTargetMonthChange(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />

            <div className="pt-2 border-t border-slate-900 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-cyan-400" />
                {t.startDateLabel} & {t.startTimeLabel}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={config.startDate}
                  min={firstDayOfConfigMonthStr}
                  max={lastDayOfConfigMonthStr}
                  onChange={(e) => setConfig((p) => ({ ...p, startDate: e.target.value }))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <input
                  type="time"
                  value={config.startHour}
                  onChange={(e) => setConfig((p) => ({ ...p, startHour: e.target.value }))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                {language === 'ar' ? 'بداية أول نوبتجية في الشهر' : 'First shift kicks off on this date & time'}
              </span>
            </div>
          </div>

          {/* Card 2: End Date & Time Within The Same Month */}
          {config.planningScope !== 'cycle_count' ? (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {t.monthEndDateLabel} & {t.monthEndTimeLabel}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {language === 'ar' ? 'ضمن نفس الشهر' : 'Same Month'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={config.desiredEndDate || lastDayOfConfigMonthStr}
                  min={config.startDate || firstDayOfConfigMonthStr}
                  max={lastDayOfConfigMonthStr}
                  onChange={(e) => setConfig((p) => ({ ...p, desiredEndDate: e.target.value }))}
                  className="bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <input
                  type="time"
                  value={config.desiredEndTime || '20:00'}
                  onChange={(e) => setConfig((p) => ({ ...p, desiredEndTime: e.target.value }))}
                  className="bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Quick Presets within Same Month */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {language === 'ar' ? 'خيارات سريعة لنهاية الشهر:' : 'Quick Presets within this Month:'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPresetEndOfMonthTime('20:00')}
                    className={`text-[10px] px-2 py-0.5 rounded border transition ${
                      config.desiredEndDate === lastDayOfConfigMonthStr && config.desiredEndTime === '20:00'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    🗓️ {t.endOfSelectedMonth} (20:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetEndOfMonthTime('08:00')}
                    className={`text-[10px] px-2 py-0.5 rounded border transition ${
                      config.desiredEndDate === lastDayOfConfigMonthStr && config.desiredEndTime === '08:00'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    🌙 {t.endOfSelectedMonth} (08:00 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetSameMonthDay(15, '20:00')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    🌓 {t.midMonthPreset}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetSameMonthDay(25, '20:00')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    🏁 {t.threeQuarterMonthPreset}
                  </button>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 block pt-0.5 leading-tight">
                {t.sameMonthBoundaryNote}
              </span>
            </div>
          ) : (
            /* Cycle Count Selector (when cycle_count mode) */
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {t.cyclesCountLabel}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {config.cycleCount} {language === 'ar' ? 'دورات' : 'Cycles'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, cycleCount: Math.max(1, (p.cycleCount || 5) - 1) }))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="31"
                  value={config.cycleCount}
                  onChange={(e) => setConfig((p) => ({ ...p, cycleCount: parseInt(e.target.value, 10) }))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, cycleCount: Math.min(31, (p.cycleCount || 5) + 1) }))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1 pt-1">
                {[5, 10, 15, 20, 25, 31].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, cycleCount: count }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition ${
                      config.cycleCount === count
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Incomplete Cycle / Half-Cycle Option Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  {t.incompleteCycleLabel}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.allowIncompleteCycle}
                    onChange={(e) => setConfig((p) => ({ ...p, allowIncompleteCycle: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {t.incompleteCycleDesc}
              </p>
            </div>

            {hasIncompleteCycle && (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{t.halfCycleDetected}</span>
              </div>
            )}
          </div>

        </div>

        {/* Rotation Timespan & Complete Dates Display Card (Start Time & End Time) */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            
            {/* Start point */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                {t.shiftStartTime}
              </span>
              <div className="font-mono font-bold text-white text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                {seriesStartDateFormatted || `${config.startDate} ${formatHMTo12(config.startHour)}`}
              </div>
            </div>

            <div className="hidden sm:block text-slate-600 font-mono">
              ══════►
            </div>

            {/* End of duty work (End Time) */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">
                {t.workEndTime} ({t.shiftEndTime})
              </span>
              <div className="font-mono font-extrabold text-emerald-300 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {seriesEndDateWorkFormatted || '—'}
              </div>
            </div>

            <div className="hidden sm:block text-slate-600 font-mono">
              ══════►
            </div>

            {/* Target Cutoff / Plan Ends Within Month */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-bold">
                {t.planEndsWithinMonth}
              </span>
              <div className="font-mono font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                {targetCutoffFormatted || seriesEndDateFormatted || '—'}
              </div>
            </div>

            <div className="hidden sm:block text-slate-600 font-mono">
              ══════►
            </div>

            {/* Full cycle end with rest */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider block font-medium">
                {t.restEndTime}
              </span>
              <div className="font-mono font-bold text-cyan-300 text-sm flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-cyan-400" />
                {seriesEndDateFormatted || '—'}
              </div>
            </div>

            {/* Total Duration Days */}
            <div className="text-right sm:border-l border-slate-800 sm:pl-3">
              <span className="text-[10px] text-slate-400 block">
                {language === 'ar' ? 'إجمالي المدى الزمني' : 'Total Span'}
              </span>
              <span className="font-mono font-extrabold text-white text-base text-cyan-400">
                {totalDaysSpan} {language === 'ar' ? 'يوماً' : 'Days'}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Review & Apply Schedule */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Header with View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              {t.step3Title}
            </h4>
            <p className="text-xs text-slate-400">
              {t.step3Desc}
            </p>
          </div>

          {/* View Mode Toggle: Calendar Plan vs Cycle List */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPlannerViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  plannerViewMode === 'calendar'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {t.calendarView}
              </button>

              <button
                type="button"
                onClick={() => setPlannerViewMode('cycles')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  plannerViewMode === 'cycles'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                {t.cycleListView}
              </button>
            </div>
          </div>
        </div>

        {/* Aggregate Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
            {t.totalPlannedShifts}: <strong className="text-white font-mono">{totalShiftsCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
            {t.totalWorkHours}: <strong className="text-cyan-200 font-mono">{totalWorkHours}h</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
            {t.totalRestHours}: <strong className="text-emerald-200 font-mono">{totalRestHours}h</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-300">
            {t.totalBiometricVerifications}: <strong className="text-blue-200 font-mono">{totalBiometricPunches}</strong>
          </span>
        </div>

        {/* VIEW 1: FULL MONTH CALENDAR PLAN (WITH START TIME AND PROMINENT END TIME) */}
        {plannerViewMode === 'calendar' && (
          <div className="space-y-4 pt-2">
            
            {/* Calendar Month Header & Navigation */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-extrabold text-white font-sans">
                  {calendarData.monthTitle}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* End Date & Time Within Month Banner */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.planEndsWithinMonth}: {targetCutoffFormatted || seriesEndDateFormatted}</span>
              </div>

              {/* Timing Legend */}
              <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-medium text-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  {t.shiftStartTime}
                </span>
                <span className="flex items-center gap-1 font-medium text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  {t.shiftEndTime}
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-300">
                  <Coffee className="w-3 h-3 text-cyan-400" />
                  {t.restPeriodTitle}
                </span>
              </div>
            </div>

            {/* 7-Column Visual Calendar Grid */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px]">
                {/* Weekday Header Row */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
                  {weekDayHeaders.map((head, i) => (
                    <div
                      key={i}
                      className="py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/80 rounded-lg border border-slate-800/80"
                    >
                      {head}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarData.cells.map((cell, idx) => {
                    if (cell.type === 'empty') {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="min-h-[110px] rounded-xl bg-slate-950/30 border border-slate-900/60 p-2 opacity-30"
                        />
                      );
                    }

                    const hasShifts = cell.shifts && cell.shifts.length > 0;
                    const isPastCutoff = Boolean(config.desiredEndDate && cell.dateStr && cell.dateStr > config.desiredEndDate);
                    const isBeforeStart = Boolean(config.startDate && cell.dateStr && cell.dateStr < config.startDate);
                    const isExactCutoffDate = Boolean(config.desiredEndDate && cell.dateStr === config.desiredEndDate);

                    return (
                      <div
                        key={cell.dateStr}
                        className={`min-h-[110px] rounded-xl border p-2 flex flex-col justify-between transition-all ${
                          isPastCutoff
                            ? 'bg-slate-950/30 border-dashed border-slate-800/70 opacity-60'
                            : hasShifts
                            ? 'bg-slate-950/90 border-cyan-500/40 hover:border-cyan-400 shadow-md'
                            : 'bg-slate-950/40 border-slate-800/70'
                        } ${cell.isToday ? 'ring-2 ring-cyan-400' : ''}`}
                      >
                        {/* Day Cell Top Bar */}
                        <div className="flex items-center justify-between pb-1 gap-1">
                          <span
                            className={`text-xs font-mono font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              cell.isToday
                                ? 'bg-cyan-500 text-slate-950 font-extrabold'
                                : hasShifts
                                ? 'text-white bg-slate-800/80'
                                : 'text-slate-500'
                            }`}
                          >
                            {cell.dayNum}
                          </span>

                          {/* Cutoff Date indicator on this day */}
                          {isExactCutoffDate && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono truncate">
                              🏁 {formatHMTo12(config.desiredEndTime || '20:00')}
                            </span>
                          )}

                          {cell.isToday && !isExactCutoffDate && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Shifts on this Day */}
                        {hasShifts ? (
                          <div className="space-y-1.5 my-1">
                            {cell.shifts!.map((shift) => {
                              const is12h = (profile.timeFormat || '12h') === '12h';
                              const startDisp = is12h ? formatHMTo12(shift.startTime) : shift.startTime;
                              const endDisp = is12h ? formatHMTo12(shift.endTime) : shift.endTime;

                              return (
                                <div
                                  key={shift.id}
                                  className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                                    shift.isHalfCycle
                                      ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                                      : shift.is24hSplit && shift.splitPart === 2
                                      ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                                      : 'bg-slate-900 border-slate-700/80 text-white'
                                  }`}
                                >
                                  {/* Shift Title */}
                                  <div className="font-bold text-[11px] truncate flex items-center justify-between">
                                    <span className="truncate">{shift.title.split('—')[0]}</span>
                                    {shift.isHalfCycle && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold shrink-0">
                                        12h
                                      </span>
                                    )}
                                  </div>

                                  {/* PROMINENT START TIME & END TIME DISPLAY */}
                                  <div className="bg-slate-950/90 rounded p-1.5 border border-slate-800 space-y-0.5">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-slate-400">{t.shiftStartTime}:</span>
                                      <span className="text-cyan-300 font-bold">{startDisp}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-emerald-400 font-semibold">{t.shiftEndTime}:</span>
                                      <span className="text-emerald-400 font-extrabold">{endDisp}</span>
                                    </div>

                                    {shift.endDate !== shift.startDate && (
                                      <div className="text-[9px] text-amber-300/90 font-mono text-right">
                                        ➔ {shift.endDate}
                                      </div>
                                    )}
                                  </div>

                                  {/* Mandatory Rest End Time if specified */}
                                  {shift.restPeriodEndsAt && (
                                    <div className="text-[9px] text-slate-400 flex items-center gap-1 font-mono pt-0.5">
                                      <Coffee className="w-2.5 h-2.5 text-cyan-400" />
                                      <span>{language === 'ar' ? 'نهاية الراحة:' : 'Rest Ends:'} {shift.restPeriodEndsAt.split('at')[1] || shift.restPeriodEndsAt}</span>
                                    </div>
                                  )}

                                  {/* Biometrics required */}
                                  <div className="flex items-center gap-1 text-[9px] text-cyan-400/80">
                                    <Fingerprint className="w-2.5 h-2.5" />
                                    <span>{language === 'ar' ? 'بصمة حضور وانصراف' : 'In & Out Punches'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-[10px] text-slate-500 flex flex-col items-center justify-center gap-1">
                            {isPastCutoff ? (
                              <>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-semibold">
                                  🏁 {t.planCutoffReached}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {language === 'ar'
                                    ? `انتهى الروتيشن في ${formatHMTo12(config.desiredEndTime || '20:00')}`
                                    : `Concluded at ${formatHMTo12(config.desiredEndTime || '20:00')}`}
                                </span>
                              </>
                            ) : isBeforeStart ? (
                              <span className="text-[9px] text-slate-500">
                                {language === 'ar' ? 'قبل بداية الروتيشن' : 'Before Start'}
                              </span>
                            ) : (
                              <>
                                <Coffee className="w-3.5 h-3.5 text-slate-600" />
                                <span>{language === 'ar' ? 'راحة / إجازة' : 'Off / Rest'}</span>
                              </>
                            )}
                          </div>
                        )}

                        <div className="text-[9px] text-slate-500 text-right font-mono">
                          {cell.dateStr?.slice(-5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: CONTINUOUS ROTATION CYCLE CARDS LIST (WITH START & END TIME ENHANCEMENT) */}
        {plannerViewMode === 'cycles' && (
          <div className="space-y-4 pt-2">
            {cycles.map((cycle) => {
              return (
                <div
                  key={cycle.cycleIndex}
                  className={`rounded-xl border transition overflow-hidden shadow-md ${
                    cycle.isHalfCycle
                      ? 'bg-slate-950/90 border-cyan-500/50 hover:border-cyan-400'
                      : cycle.isIncompleteCycle
                      ? 'bg-slate-950/90 border-amber-500/50 hover:border-amber-400'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Cycle Top Bar */}
                  <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                        #{cycle.cycleIndex}
                      </span>
                      <div>
                        <span className="font-bold text-white text-sm flex items-center gap-2">
                          {cycle.cycleTitle}
                          {cycle.isHalfCycle && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                              {t.halfCycleBadge}
                            </span>
                          )}
                          {cycle.isIncompleteCycle && !cycle.isHalfCycle && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                              {t.incompleteCycleBadge}
                            </span>
                          )}
                        </span>
                        
                        {/* Cycle Start Time and End Time */}
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>{cycle.startDate}</span>
                          <span>•</span>
                          <span className="text-cyan-300 font-mono font-bold">
                            {t.shiftStartTime}: {cycle.startTimeFormatted}
                          </span>
                          <span>➔</span>
                          <span className="text-emerald-400 font-mono font-extrabold">
                            {t.shiftEndTime}: {cycle.endTimeFormatted}
                          </span>
                          <span>({cycle.workDurationHours}h {language === 'ar' ? 'عمل' : 'work'})</span>
                        </div>
                      </div>
                    </div>

                    {/* Rest & Immediate Next Shift Indicator */}
                    <div className="text-right text-xs">
                      <div className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1 justify-end">
                        <Coffee className="w-3.5 h-3.5" />
                        <span>
                          {language === 'ar' ? 'راحة 6 ساعات حتى' : '6h Rest Until'} {cycle.restEndTimeFormatted}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'ar' ? 'تبدأ النوبة التالية فوراً' : 'Next shift begins immediately after'}
                      </div>
                    </div>
                  </div>

                  {/* Shifts inside this Cycle */}
                  <div className="p-3.5 space-y-2.5">
                    {cycle.shifts.map((shift, sIdx) => {
                      const is12h = (profile.timeFormat || '12h') === '12h';
                      const startDisp = is12h ? formatHMTo12(shift.startTime) : shift.startTime;
                      const endDisp = is12h ? formatHMTo12(shift.endTime) : shift.endTime;

                      return (
                        <div
                          key={shift.id}
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-xs">{shift.title}</span>
                              {shift.is24hSplit && (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                  {shift.splitPart === 1 ? t.part1Label : t.part2Label}
                                </span>
                              )}
                              {shift.isHalfCycle && (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                                  {t.halfCycleBadge}
                                </span>
                              )}
                            </div>

                            {/* Detailed Start Time & End Time */}
                            <div className="text-slate-400 flex flex-wrap items-center gap-3 text-[11px]">
                              <span className="font-mono text-cyan-300 font-semibold flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                {shift.startDate}: {startDisp} ➔ <strong className="text-emerald-400 font-bold">{endDisp}</strong>
                              </span>
                              {shift.endDate !== shift.startDate && (
                                <span className="font-mono text-amber-300 font-medium">
                                  ({language === 'ar' ? 'ينتهي في:' : 'Ends:'} {shift.endDate})
                                </span>
                              )}
                              <span>• {shift.department}</span>
                              <span className="text-slate-500">• {shift.fingerprintStation}</span>
                            </div>
                          </div>

                          {/* Fingerprint Requirements Pill */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                              <Fingerprint className="w-3 h-3 text-cyan-400" />
                              <span>
                                {language === 'ar' ? 'بصمة حضور وبصمة انصراف' : 'IN & OUT Biometrics Required'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Apply Action Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {language === 'ar'
              ? `${totalShiftsCount} وردية مجدولة حتى ${seriesEndDateWorkFormatted || config.desiredEndDate}.`
              : `${totalShiftsCount} shifts scheduled through ${seriesEndDateWorkFormatted}.`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCommitSchedule}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition transform active:scale-95 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? `اعتماد الجدول (${cycles.length} دورة)`
                  : `Apply Schedule (${cycles.length} Cycles)`}
              </span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
