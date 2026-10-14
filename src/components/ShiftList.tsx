import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Fingerprint,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Share2,
  FileText,
  CalendarCheck,
  LogIn,
  LogOut,
} from 'lucide-react';
import { HospitalShift, ShiftType } from '../types';
import { formatHMTo12 } from '../utils/timeFormat';
import { Language, translations } from '../utils/i18n';

interface ShiftListProps {
  shifts: HospitalShift[];
  onAddNewShift: () => void;
  onEditShift: (shift: HospitalShift) => void;
  onDeleteShift: (shiftId: string) => void;
  onRecordFingerprint: (shiftId: string, type: 'in' | 'out') => void;
  onSyncShiftToCalendar?: (shift: HospitalShift) => void;
  language?: Language;
}

export const ShiftList: React.FC<ShiftListProps> = ({
  shifts,
  onAddNewShift,
  onEditShift,
  onDeleteShift,
  onRecordFingerprint,
  onSyncShiftToCalendar,
  language = 'en',
}) => {
  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredShifts = shifts.filter((shift) => {
    // Type filter
    if (filterType !== 'all' && shift.shiftType !== filterType) return false;

    // Time filter
    if (filterTime === 'today' && shift.startDate !== todayStr) return false;
    if (filterTime === 'upcoming' && shift.startDate < todayStr) return false;
    if (filterTime === 'past' && shift.startDate >= todayStr) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = shift.title.toLowerCase().includes(q);
      const matchDept = shift.department.toLowerCase().includes(q);
      const matchStation = shift.fingerprintStation.toLowerCase().includes(q);
      const matchNotes = (shift.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDept && !matchStation && !matchNotes) return false;
    }

    return true;
  });

  const getShiftBadge = (type: ShiftType) => {
    switch (type) {
      case 'morning':
        return { label: 'Morning Duty', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'evening':
        return { label: 'Evening Duty', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'night':
        return { label: 'Night On-Call', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
      case '24h_duty':
        return { label: '24-Hour Trauma Call', bg: 'bg-red-500/10 text-red-400 border-red-500/30 font-bold' };
      case 'clinic':
        return { label: 'OPD Clinic', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      default:
        return { label: 'Duty Shift', bg: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Hospital Duty Schedule
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredShifts.length} Shift{filteredShifts.length === 1 ? '' : 's'}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Automated alerts are armed before each shift to guarantee biometric fingerprint compliance.
          </p>
        </div>

        <button
          onClick={onAddNewShift}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Schedule Shift
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Time Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          {(['all', 'today', 'upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTime(t)}
              className={`px-3 py-1 rounded-md font-semibold capitalize transition ${
                filterTime === t
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Shift Type Dropdown & Search Input */}
        <div className="flex flex-1 sm:flex-initial items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Duty Types</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="night">Night On-Call</option>
            <option value="24h_duty">24-Hour Call</option>
            <option value="clinic">Clinic</option>
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department, station..."
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-48"
          />
        </div>

      </div>

      {/* Shift Cards Grid */}
      {filteredShifts.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm">No hospital shifts match your current filters.</p>
          <button
            onClick={onAddNewShift}
            className="text-xs text-cyan-400 font-semibold hover:underline"
          >
            + Create a new hospital shift
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredShifts.map((shift) => {
            const badge = getShiftBadge(shift.shiftType);
            const isToday = shift.startDate === todayStr;
            const isClockedIn = shift.fingerprintInStatus === 'clocked_in';
            const isClockedOut = shift.fingerprintOutStatus === 'clocked_out';

            return (
              <div
                key={shift.id}
                className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 shadow-lg flex flex-col justify-between transition-all duration-200"
              >
                {/* Top Bar: Badges & Controls */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {isToday && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                          TODAY
                        </span>
                      )}
                      {shift.googleCalendarEventId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                          <CalendarCheck className="w-3 h-3" /> Calendar Synced
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditShift(shift)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(shift.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Department */}
                  <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                    {shift.title}
                  </h4>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {shift.department}
                    </span>
                    <span>•</span>
                    <span className="truncate">{shift.hospitalName}</span>
                  </div>

                  {/* Schedule Timings */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="text-slate-400 text-[11px]">Shift Timing (12h AM/PM)</div>
                      <div className="font-mono text-cyan-300 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {shift.startDate} : {formatHMTo12(shift.startTime)} — {formatHMTo12(shift.endTime)}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="text-slate-400 text-[11px]">Reminders</div>
                      <div className="text-slate-300 font-medium">
                        {(shift.remindersMinutesBefore || [60, 30, 15])
                          .map((m) => (m === 0 ? 'Start' : `${m}m`))
                          .join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Biometric Station Card */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                        Biometric Station:
                      </span>
                      <span className="text-cyan-400 font-semibold truncate max-w-[180px]">
                        {shift.fingerprintStation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      {/* Fingerprint Clock-In status */}
                      <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 font-semibold flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-cyan-400" />
                          {t.shiftIn}:
                        </span>
                        {isClockedIn ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.shiftInVerified}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRecordFingerprint(shift.id, 'in')}
                            className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] shadow transition active:scale-95"
                          >
                            {t.punchIn}
                          </button>
                        )}
                      </div>

                      {/* Fingerprint Clock-Out status */}
                      <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 font-semibold flex items-center gap-1">
                          <LogOut className="w-3 h-3 text-blue-400" />
                          {t.shiftOut}:
                        </span>
                        {isClockedOut ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.shiftOutVerified}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRecordFingerprint(shift.id, 'out')}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shadow transition active:scale-95"
                          >
                            {t.punchOut}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {shift.notes && (
                    <div className="mt-2.5 text-xs text-slate-400 italic line-clamp-2">
                      "{shift.notes}"
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  {onSyncShiftToCalendar && !shift.googleCalendarEventId ? (
                    <button
                      onClick={() => onSyncShiftToCalendar(shift)}
                      className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Sync with Google Calendar
                    </button>
                  ) : (
                    <span className="text-slate-500 text-[11px]">
                      {shift.locationDetails || 'Hospital duty logged'}
                    </span>
                  )}

                  <span className="font-mono text-slate-500 text-[11px]">
                    ID: {shift.id.slice(-6)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/50 p-5 rounded-2xl max-w-sm w-full space-y-3 text-white">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              Delete Hospital Shift?
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove this shift? Any active automated notifications for this shift will be cancelled.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteShift(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
              >
                Delete Shift
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
