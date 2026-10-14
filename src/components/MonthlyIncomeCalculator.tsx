import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  Building2,
  TrendingUp,
  Percent,
  MinusCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calculator,
  Minus,
  Plus,
  RefreshCw,
  Zap,
  Check,
  RotateCcw,
} from 'lucide-react';
import { HospitalShift, FingerprintLogEntry, UserProfile } from '../types';
import { formatHMTo12 } from '../utils/timeFormat';
import { Language, translations } from '../utils/i18n';

interface MonthlyIncomeCalculatorProps {
  shifts: HospitalShift[];
  logs: FingerprintLogEntry[];
  profile: UserProfile;
  onUpdateShift: (shift: HospitalShift) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  language?: Language;
}

export const MonthlyIncomeCalculator: React.FC<MonthlyIncomeCalculatorProps> = ({
  shifts,
  logs,
  profile,
  onUpdateShift,
  onUpdateProfile,
  language = profile.language || 'en',
}) => {
  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';

  // Current month default (YYYY-MM)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const [hourlyRate, setHourlyRate] = useState<number>(profile.hourlyRate || 50);
  const [currency, setCurrency] = useState<string>(profile.currency || '$');

  // Compute shift hours from start & end time
  const getShiftDurationHours = (shift: HospitalShift): number => {
    if (shift.scheduledDurationHours) return shift.scheduledDurationHours;
    if (shift.is24hSplit) return 12; // Each 24h sub-shift is 12 hours
    const start = new Date(`${shift.startDate}T${shift.startTime}:00`);
    const end = new Date(`${shift.endDate}T${shift.endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / 3600000;
    return hours > 0 ? hours : 12; // fallback
  };

  // Compute missed minutes for a shift based on logs or stored values
  const getShiftMissedMinutes = (shift: HospitalShift): number => {
    if (shift.missedMinutes !== undefined) return shift.missedMinutes;

    let missed = 0;

    // Check IN punch in logs
    const inLog = logs.find((l) => l.shiftId === shift.id && l.type === 'in');
    if (inLog) {
      // If late beyond grace window, count minutes
      if (inLog.differenceMinutes > shift.fingerprintInWindowMinutes) {
        missed += inLog.differenceMinutes - shift.fingerprintInWindowMinutes;
      }
    } else if (shift.fingerprintInStatus === 'missed') {
      missed += 60; // 1 hour penalty for missing IN punch
    }

    // Check OUT punch in logs
    const outLog = logs.find((l) => l.shiftId === shift.id && l.type === 'out');
    if (outLog) {
      // If punched out earlier than scheduled
      if (outLog.differenceMinutes < -5) {
        missed += Math.abs(outLog.differenceMinutes);
      }
    } else if (shift.fingerprintOutStatus === 'missed') {
      missed += 60; // 1 hour penalty for missing OUT punch
    }

    return Math.max(0, missed);
  };

  // Filter shifts in the selected month
  const monthlyShifts = useMemo(() => {
    return shifts.filter((s) => s.startDate.startsWith(selectedMonth));
  }, [shifts, selectedMonth]);

  // Aggregate monthly calculations
  const totalScheduledHours = useMemo(() => {
    return monthlyShifts.reduce((acc, s) => acc + getShiftDurationHours(s), 0);
  }, [monthlyShifts]);

  const totalMissedMinutes = useMemo(() => {
    return monthlyShifts.reduce((acc, s) => acc + getShiftMissedMinutes(s), 0);
  }, [monthlyShifts, logs]);

  const missedHoursDiscount = totalMissedMinutes / 60;
  const netHoursAttended = Math.max(0, totalScheduledHours - missedHoursDiscount);

  const grossIncome = totalScheduledHours * hourlyRate;
  const discountAmount = missedHoursDiscount * hourlyRate;
  const netIncome = Math.max(0, netHoursAttended * hourlyRate);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth, language]);

  const handleRateChange = (newRate: number) => {
    setHourlyRate(newRate);
    onUpdateProfile({ ...profile, hourlyRate: newRate, currency });
  };

  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    onUpdateProfile({ ...profile, hourlyRate, currency: newCurr });
  };

  const handleUpdateShiftMissedMinutes = (shift: HospitalShift, minutes: number) => {
    onUpdateShift({
      ...shift,
      missedMinutes: Math.max(0, minutes),
    });
  };

  const handleExportPayrollCSV = () => {
    if (monthlyShifts.length === 0) return;

    const headers = [
      'Shift Title',
      'Department',
      'Date',
      'Scheduled Hours',
      'Missed Minutes',
      'Net Hours',
      'Hourly Rate',
      'Shift Gross',
      'Late Discount',
      'Shift Net Payout',
    ];

    const rows = monthlyShifts.map((s) => {
      const dur = getShiftDurationHours(s);
      const missed = getShiftMissedMinutes(s);
      const net = Math.max(0, dur - missed / 60);
      const gross = dur * hourlyRate;
      const disc = (missed / 60) * hourlyRate;
      const payout = net * hourlyRate;

      return [
        `"${s.title.replace(/"/g, '""')}"`,
        `"${s.department.replace(/"/g, '""')}"`,
        s.startDate,
        dur.toFixed(1),
        missed,
        net.toFixed(2),
        `${currency}${hourlyRate.toFixed(2)}`,
        `${currency}${gross.toFixed(2)}`,
        `-${currency}${disc.toFixed(2)}`,
        `${currency}${payout.toFixed(2)}`,
      ];
    });

    const summaryRow = [
      'TOTAL MONTH SUMMARY',
      '',
      selectedMonth,
      totalScheduledHours.toFixed(1),
      totalMissedMinutes,
      netHoursAttended.toFixed(2),
      `${currency}${hourlyRate.toFixed(2)}/hr`,
      `${currency}${grossIncome.toFixed(2)}`,
      `-${currency}${discountAmount.toFixed(2)}`,
      `${currency}${netIncome.toFixed(2)}`,
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hospital_attendance_income_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            {t.incomeTitle}
          </h3>
          <p className="text-xs text-slate-400">
            {t.incomeSub}
          </p>
        </div>

        {/* Month Navigator Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 font-semibold text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{monthLabel}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportPayrollCSV}
            disabled={monthlyShifts.length === 0}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
            title="Export monthly salary & deduction report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* Hourly Rate & Currency Settings Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Configure Your Hourly Duty Rate
          </div>
          <div className="text-xs text-slate-400">
            Set your contracted price per hour. Formula: <code>Net Income = (Scheduled Hours - Missed Minutes / 60) × Hourly Price</code>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Selector */}
          <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400">Currency:</span>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="$" className="bg-slate-900">$ (USD)</option>
              <option value="EGP" className="bg-slate-900">EGP (LE)</option>
              <option value="SAR" className="bg-slate-900">SAR (SR)</option>
              <option value="AED" className="bg-slate-900">AED</option>
              <option value="€" className="bg-slate-900">€ (EUR)</option>
              <option value="£" className="bg-slate-900">£ (GBP)</option>
            </select>
          </div>

          {/* Quick Preset Rate Pills */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[30, 45, 50, 75, 100].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                  hourlyRate === rate
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {currency}{rate}
              </button>
            ))}
          </div>

          {/* Custom Hourly Input */}
          <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400">{currency}</span>
            <input
              type="number"
              min="1"
              max="5000"
              step="1"
              value={hourlyRate}
              onChange={(e) => handleRateChange(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-20 bg-transparent text-white font-bold text-sm focus:outline-none font-mono"
            />
            <span className="text-slate-400">/ hour</span>
          </div>
        </div>
      </div>

      {/* Simple Step-by-Step Income Formula Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {language === 'ar' ? 'معادلة حساب الراتب الشهري وخصومات الوقت الضائع' : 'Simple Monthly Income & Deduction Formula'}
            </h4>
          </div>
          <div className="text-xs text-emerald-300 font-mono font-semibold">
            {t.formulaBanner}
          </div>
        </div>

        {/* Step-by-Step Interactive Flow Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs items-stretch">
          
          {/* Step 1: Scheduled Hours */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">{t.scheduledHoursLabel}</span>
            <div className="font-mono font-extrabold text-white text-lg">
              {totalScheduledHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ساعة' : 'hrs'}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {language === 'ar' ? 'إجمالي الساعات المجدولة' : 'Total roster duty time'}
            </span>
          </div>

          {/* Step 2: Missed Minutes Counter (Collected Automatically) */}
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-300 font-medium block">{t.missedTimeCounterLabel}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                {language === 'ar' ? 'آلي' : 'Auto'}
              </span>
            </div>
            <div className="font-mono font-extrabold text-amber-400 text-lg">
              {totalMissedMinutes} <span className="text-xs font-normal text-amber-300/80">{language === 'ar' ? 'دقيقة' : 'mins'}</span>
            </div>
            <span className="text-[10px] text-red-400 block font-medium">
              = -{missedHoursDiscount.toFixed(2)} {language === 'ar' ? 'ساعة خصم' : 'hrs discount'}
            </span>
          </div>

          {/* Step 3: Net Hours Attended */}
          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1">
            <span className="text-[10px] text-cyan-300 font-medium block">{t.netHoursAttendedLabel}</span>
            <div className="font-mono font-extrabold text-cyan-300 text-lg">
              {netHoursAttended.toFixed(2)} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ساعة' : 'hrs'}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {totalScheduledHours.toFixed(1)}h - {missedHoursDiscount.toFixed(2)}h
            </span>
          </div>

          {/* Step 4: Hour Price */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-medium block">{t.hourlyPriceLabel}</span>
            <div className="font-mono font-extrabold text-white text-lg">
              {currency}{hourlyRate.toFixed(2)} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? '/ ساعة' : '/ hr'}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {language === 'ar' ? 'سعر الساعة المعتمد' : 'Contracted rate'}
            </span>
          </div>

          {/* Step 5: Net Month Income (Product) */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border-2 border-emerald-500/50 space-y-1 sm:col-span-2 lg:col-span-1 shadow-lg">
            <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">{t.netMonthlyIncomeLabel}</span>
            <div className="font-mono font-extrabold text-emerald-400 text-xl truncate">
              {currency}{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {netHoursAttended.toFixed(2)}h × {currency}{hourlyRate}
            </span>
          </div>

        </div>
      </div>

      {/* Four Core Metric Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Gross Scheduled Hours */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Scheduled Duty Hours
            </span>
            <span className="text-[10px] text-slate-500">{monthlyShifts.length} Shifts</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono pt-1">
            {totalScheduledHours.toFixed(1)} <span className="text-xs font-sans text-slate-400 font-normal">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Gross potential: {currency}{grossIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 2: Missed Time Counter by Minutes */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-lg space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs text-amber-300 flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Missed Time Counter
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
              {missedHoursDiscount.toFixed(2)}h
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono pt-1">
            {totalMissedMinutes} <span className="text-xs font-sans text-amber-300/80 font-normal">minutes</span>
          </div>
          <div className="text-[11px] text-red-400 font-medium">
            Discount penalty: -{currency}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 3: Net Hours Attended */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Net Hours Attended
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {totalScheduledHours > 0 ? ((netHoursAttended / totalScheduledHours) * 100).toFixed(1) : 100}%
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono pt-1">
            {netHoursAttended.toFixed(2)} <span className="text-xs font-sans text-slate-400 font-normal">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500">
            After discounting {totalMissedMinutes}m missed time
          </div>
        </div>

        {/* Card 4: Total Net Month Income */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/5 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs text-emerald-300 flex items-center justify-between font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Net Month Payout
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold">
              PAYROLL
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono pt-1">
            {currency}{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium font-mono">
            {netHoursAttended.toFixed(2)} hrs × {currency}{hourlyRate}/hr
          </div>
        </div>

      </div>

      {/* Detailed Shift-by-Shift Attendance & Penalty Breakdown */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Shift Attendance &amp; Deduction Ledger ({monthLabel})
            </h4>
            <p className="text-xs text-slate-400">
              Exact breakdown of hours, missed minutes, deduction discounts, and final payout per duty shift
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Total shifts evaluated: <strong className="text-white">{monthlyShifts.length}</strong>
          </div>
        </div>

        {monthlyShifts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No hospital shifts found for {monthLabel}.</p>
            <p className="text-[11px] text-slate-500">
              Use the Week Planner or Schedule Shift to generate your duties for this month.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyShifts.map((shift) => {
              const durationHours = getShiftDurationHours(shift);
              const missedMinutes = getShiftMissedMinutes(shift);
              const netHours = Math.max(0, durationHours - missedMinutes / 60);
              const shiftGross = durationHours * hourlyRate;
              const shiftDiscount = (missedMinutes / 60) * hourlyRate;
              const shiftNet = netHours * hourlyRate;

              const is12hFormat = (profile.timeFormat || '12h') === '12h';
              const startDisplay = is12hFormat ? formatHMTo12(shift.startTime) : shift.startTime;
              const endDisplay = is12hFormat ? formatHMTo12(shift.endTime) : shift.endTime;

              return (
                <div
                  key={shift.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  {/* Left: Shift info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{shift.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {shift.startDate}
                      </span>
                      {shift.is24hSplit && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          12h Segment #{shift.splitPart} of 24h
                        </span>
                      )}
                    </div>

                    <div className="text-slate-400 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-cyan-300 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {startDisplay} — {endDisplay} ({durationHours}h)
                      </span>
                      <span>• {shift.department}</span>
                      <span>• {shift.fingerprintStation}</span>
                    </div>
                  </div>

                  {/* Middle: Missed Minutes Counter Editor */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 shrink-0">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">Missed Time Counter:</span>
                        {missedMinutes > 0 && (
                          <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-300 font-mono">
                            -{(missedMinutes / 60).toFixed(2)}h
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateShiftMissedMinutes(shift, Math.max(0, missedMinutes - 5))}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
                          title="Decrease 5 minutes"
                        >
                          -5m
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={durationHours * 60}
                          value={missedMinutes}
                          onChange={(e) =>
                            handleUpdateShiftMissedMinutes(shift, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleUpdateShiftMissedMinutes(shift, missedMinutes + 5)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
                          title="Add 5 minutes missed"
                        >
                          +5m
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateShiftMissedMinutes(shift, missedMinutes + 15)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
                          title="Add 15 minutes missed"
                        >
                          +15m
                        </button>

                        {missedMinutes > 0 && (
                          <button
                            type="button"
                            onClick={() => handleUpdateShiftMissedMinutes(shift, 0)}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition"
                            title="Excuse penalty (Reset to 0 mins)"
                          >
                            0m
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-px h-8 bg-slate-800 mx-1 hidden sm:block" />

                    <div className="space-y-0.5 text-left">
                      <span className="text-[10px] text-slate-400 block font-medium">Net Hours:</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs block">
                        {netHours.toFixed(2)}h
                      </span>
                      <span className="text-[9px] text-slate-500">of {durationHours}h</span>
                    </div>
                  </div>

                  {/* Right: Income & Discount */}
                  <div className="text-left lg:text-right space-y-0.5 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-800">
                    <div className="font-mono font-bold text-white text-sm">
                      {currency}{shiftNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Gross: {currency}{shiftGross.toFixed(2)}{' '}
                      {missedMinutes > 0 ? (
                        <span className="text-red-400 font-semibold">
                          (Deduction: -{currency}{shiftDiscount.toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">(No Penalty)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Summary Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Gross Total: <strong className="text-white">{currency}{grossIncome.toFixed(2)}</strong> • Total Deductions:{' '}
            <strong className="text-red-400">-{currency}{discountAmount.toFixed(2)}</strong> ({totalMissedMinutes} mins)
          </div>

          <div className="font-mono text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
            Net Monthly Payout: {currency}{netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

    </div>
  );
};
