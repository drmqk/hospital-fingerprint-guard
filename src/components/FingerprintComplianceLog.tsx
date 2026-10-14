import React, { useState } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { FingerprintLogEntry } from '../types';

interface FingerprintComplianceLogProps {
  logs: FingerprintLogEntry[];
  onClearLogs?: () => void;
}

export const FingerprintComplianceLog: React.FC<FingerprintComplianceLogProps> = ({
  logs,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    return true;
  });

  const totalLogs = logs.length;
  const onTimeCount = logs.filter((l) => l.status === 'on_time').length;
  const graceCount = logs.filter((l) => l.status === 'grace_period').length;
  const lateCount = logs.filter((l) => l.status === 'late').length;

  const complianceRate = totalLogs > 0 ? Math.round(((onTimeCount + graceCount) / totalLogs) * 100) : 100;

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Record ID',
      'Duty Shift',
      'Hospital',
      'Department',
      'Biometric Station',
      'Type',
      'Scheduled Time',
      'Actual Scanned Time',
      'Variance (Mins)',
      'Compliance Status',
      'Notes',
    ];

    const rows = logs.map((l) => [
      l.id,
      `"${l.shiftTitle.replace(/"/g, '""')}"`,
      `"${l.hospitalName.replace(/"/g, '""')}"`,
      `"${l.department.replace(/"/g, '""')}"`,
      `"${l.station.replace(/"/g, '""')}"`,
      l.type.toUpperCase(),
      l.scheduledTime,
      l.actualTimestamp,
      l.differenceMinutes,
      l.status,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hospital_fingerprint_attendance_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-cyan-400" />
            Biometric Fingerprint Compliance Log
          </h3>
          <p className="text-xs text-slate-400">
            Verified electronic records for hospital administration, attendance audit, and duty sign-off.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Export HR Attendance CSV
        </button>
      </div>

      {/* Compliance Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Compliance Rate
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">
            {complianceRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Hospital Target: &gt;95%</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> On-Time Punches
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
            {onTimeCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Within official window</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Grace Period
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
            {graceCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Approved buffer</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30">
          <div className="text-xs text-amber-300 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Missed Minutes
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
            {logs.reduce((acc, l) => {
              if (l.type === 'in' && l.differenceMinutes > 20) return acc + (l.differenceMinutes - 20);
              if (l.type === 'out' && l.differenceMinutes < -5) return acc + Math.abs(l.differenceMinutes);
              return acc;
            }, 0)}m
          </div>
          <div className="text-[11px] text-red-400 mt-0.5">Deduction discount</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Fingerprint className="w-3.5 h-3.5 text-blue-400" /> Total Verified
          </div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1 font-mono">
            {totalLogs}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Biometric scans</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Scans ({logs.length})
        </button>
        <button
          onClick={() => setFilterType('in')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'in'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Clock-Ins ({logs.filter((l) => l.type === 'in').length})
        </button>
        <button
          onClick={() => setFilterType('out')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'out'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Clock-Outs ({logs.filter((l) => l.type === 'out').length})
        </button>
      </div>

      {/* Log Entries Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-2">
          <Fingerprint className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm">No biometric fingerprint records found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((entry) => {
            const isPunchIn = entry.type === 'in';

            return (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded-xl flex items-center justify-center shrink-0 ${
                      isPunchIn
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    <Fingerprint className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {isPunchIn ? 'Clock-In Scan' : 'Clock-Out Scan'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          entry.status === 'on_time'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : entry.status === 'grace_period'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {entry.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-slate-300 font-medium mt-0.5">
                      {entry.shiftTitle} • {entry.department}
                    </div>

                    <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span>{entry.station}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Timestamps */}
                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 space-y-0.5">
                  <div className="font-mono text-cyan-300 font-semibold text-sm">
                    {entry.actualTimestamp}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Scheduled: {entry.scheduledTime} (
                    {entry.differenceMinutes <= 0
                      ? `${Math.abs(entry.differenceMinutes)}m early`
                      : `+${entry.differenceMinutes}m`}
                    )
                  </div>
                  {entry.notes && (
                    <div className="text-[10px] text-slate-400 italic">{entry.notes}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
