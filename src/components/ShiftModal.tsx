import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Building2,
  MapPin,
  Fingerprint,
  Bell,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { HospitalShift, ShiftType, UserProfile } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveShift: (shift: HospitalShift) => void;
  shiftToEdit?: HospitalShift | null;
  profile: UserProfile;
}

const PRESETS = [
  {
    label: 'Morning Ward & OR (08:00 AM - 04:00 PM)',
    type: 'morning' as ShiftType,
    startTime: '08:00',
    endTime: '16:00',
    inWindow: 20,
    outWindow: 30,
    color: '#0284c7',
  },
  {
    label: 'Evening Clinical Shift (04:00 PM - 12:00 AM)',
    type: 'evening' as ShiftType,
    startTime: '16:00',
    endTime: '00:00',
    inWindow: 15,
    outWindow: 20,
    color: '#8b5cf6',
  },
  {
    label: 'Night On-Call Duty (08:00 PM - 08:00 AM)',
    type: 'night' as ShiftType,
    startTime: '20:00',
    endTime: '08:00',
    inWindow: 20,
    outWindow: 30,
    color: '#f97316',
  },
  {
    label: '24-Hour Trauma Call (08:00 AM - 08:00 AM)',
    type: '24h_duty' as ShiftType,
    startTime: '08:00',
    endTime: '08:00',
    inWindow: 15,
    outWindow: 30,
    color: '#ef4444',
  },
  {
    label: 'Specialty Outpatient Clinic (09:00 AM - 03:00 PM)',
    type: 'clinic' as ShiftType,
    startTime: '09:00',
    endTime: '15:00',
    inWindow: 15,
    outWindow: 30,
    color: '#10b981',
  },
];

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSaveShift,
  shiftToEdit,
  profile,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('morning');
  const [hospitalName, setHospitalName] = useState(profile.hospitalName);
  const [department, setDepartment] = useState(profile.defaultDepartment);
  const [locationDetails, setLocationDetails] = useState('');
  const [fingerprintStation, setFingerprintStation] = useState(profile.defaultFingerprintStation);
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(todayStr);
  const [endTime, setEndTime] = useState('16:00');
  const [fingerprintInRequired, setFingerprintInRequired] = useState(true);
  const [fingerprintOutRequired, setFingerprintOutRequired] = useState(true);
  const [fingerprintInWindowMinutes, setFingerprintInWindowMinutes] = useState(20);
  const [fingerprintOutWindowMinutes, setFingerprintOutWindowMinutes] = useState(30);
  const [reminders, setReminders] = useState<number[]>([60, 30, 15, 0]);
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#0284c7');

  useEffect(() => {
    if (shiftToEdit) {
      setTitle(shiftToEdit.title);
      setShiftType(shiftToEdit.shiftType);
      setHospitalName(shiftToEdit.hospitalName);
      setDepartment(shiftToEdit.department);
      setLocationDetails(shiftToEdit.locationDetails || '');
      setFingerprintStation(shiftToEdit.fingerprintStation);
      setStartDate(shiftToEdit.startDate);
      setStartTime(shiftToEdit.startTime);
      setEndDate(shiftToEdit.endDate);
      setEndTime(shiftToEdit.endTime);
      setFingerprintInRequired(shiftToEdit.fingerprintInRequired);
      setFingerprintOutRequired(shiftToEdit.fingerprintOutRequired);
      setFingerprintInWindowMinutes(shiftToEdit.fingerprintInWindowMinutes);
      setFingerprintOutWindowMinutes(shiftToEdit.fingerprintOutWindowMinutes);
      setReminders(shiftToEdit.remindersMinutesBefore || [60, 30, 15, 0]);
      setNotes(shiftToEdit.notes || '');
      setColor(shiftToEdit.color || '#0284c7');
    } else {
      // Defaults
      setTitle('Surgery & Inpatient Ward Duty');
      setShiftType('morning');
      setHospitalName(profile.hospitalName);
      setDepartment(profile.defaultDepartment);
      setFingerprintStation(profile.defaultFingerprintStation);
      setStartDate(todayStr);
      setStartTime('08:00');
      setEndDate(todayStr);
      setEndTime('16:00');
      setFingerprintInRequired(true);
      setFingerprintOutRequired(true);
      setFingerprintInWindowMinutes(20);
      setFingerprintOutWindowMinutes(30);
      setReminders([60, 30, 15, 0]);
      setNotes('');
      setColor('#0284c7');
    }
  }, [shiftToEdit, isOpen, profile, todayStr]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setTitle(preset.label.split('(')[0].trim());
    setShiftType(preset.type);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setFingerprintInWindowMinutes(preset.inWindow);
    setFingerprintOutWindowMinutes(preset.outWindow);
    setColor(preset.color);

    // If overnight or 24h, adjust end date to next day
    if (preset.type === 'night' || preset.type === '24h_duty') {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 1);
      setEndDate(d.toISOString().split('T')[0]);
    } else {
      setEndDate(startDate);
    }
  };

  const toggleReminder = (mins: number) => {
    setReminders((prev) =>
      prev.includes(mins) ? prev.filter((m) => m !== mins) : [...prev, mins].sort((a, b) => b - a)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: HospitalShift = {
      id: shiftToEdit ? shiftToEdit.id : `shift-${Date.now()}`,
      title: title.trim() || 'Hospital Duty Shift',
      shiftType,
      hospitalName: hospitalName.trim() || profile.hospitalName,
      department: department.trim() || profile.defaultDepartment,
      locationDetails: locationDetails.trim(),
      fingerprintStation: fingerprintStation.trim() || profile.defaultFingerprintStation,
      startDate,
      startTime,
      endDate: endDate || startDate,
      endTime,
      fingerprintInRequired,
      fingerprintOutRequired,
      fingerprintInWindowMinutes: Number(fingerprintInWindowMinutes) || 15,
      fingerprintOutWindowMinutes: Number(fingerprintOutWindowMinutes) || 30,
      fingerprintInStatus: shiftToEdit ? shiftToEdit.fingerprintInStatus : 'pending',
      fingerprintOutStatus: shiftToEdit ? shiftToEdit.fingerprintOutStatus : 'pending',
      fingerprintInTimestamp: shiftToEdit?.fingerprintInTimestamp,
      fingerprintOutTimestamp: shiftToEdit?.fingerprintOutTimestamp,
      remindersMinutesBefore: reminders,
      notes: notes.trim(),
      color,
      googleCalendarEventId: shiftToEdit?.googleCalendarEventId,
      lastSyncedWithGoogle: shiftToEdit?.lastSyncedWithGoogle,
    };

    onSaveShift(newShift);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {shiftToEdit ? 'Edit Hospital Shift' : 'Schedule Hospital Shift'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure timing, department, and automated fingerprint alert windows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          
          {/* Quick Hospital Duty Presets */}
          <div>
            <label className="block text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Duty Presets:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => handleApplyPreset(p)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-left border border-slate-700 text-slate-200 transition text-[11px] font-medium"
                >
                  <div className="font-semibold text-white truncate">{p.label.split('(')[0]}</div>
                  <div className="text-cyan-400 font-mono mt-0.5">{p.startTime} - {p.endTime}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Shift Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Shift Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. General Surgery Inpatient & OR"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Shift Type</label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as ShiftType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="morning">Morning (AM)</option>
                <option value="evening">Evening (PM)</option>
                <option value="night">Night Duty</option>
                <option value="24h_duty">24-Hour Call</option>
                <option value="clinic">Outpatient Clinic</option>
                <option value="rounds">Grand Rounds</option>
                <option value="custom">Custom Shift</option>
              </select>
            </div>
          </div>

          {/* Hospital, Department, Station */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" /> Hospital Name
              </label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Department / Ward</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" /> Biometric Station *
              </label>
              <input
                type="text"
                required
                value={fingerprintStation}
                onChange={(e) => setFingerprintStation(e.target.value)}
                placeholder="Station 3 - Ground Gate"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Dates & Times */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> Shift Timing (24h format)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Biometric Fingerprint Requirements & Windows */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-cyan-400" /> Biometric Attendance Rules
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fingerprintInRequired}
                    onChange={(e) => setFingerprintInRequired(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-200">Mandatory Fingerprint Clock-In</span>
                </label>
                {fingerprintInRequired && (
                  <div className="flex items-center gap-2 text-slate-400 pl-6">
                    <span>Window: ±</span>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={fingerprintInWindowMinutes}
                      onChange={(e) => setFingerprintInWindowMinutes(Number(e.target.value))}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-center"
                    />
                    <span>minutes of shift start</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fingerprintOutRequired}
                    onChange={(e) => setFingerprintOutRequired(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-200">Mandatory Fingerprint Clock-Out</span>
                </label>
                {fingerprintOutRequired && (
                  <div className="flex items-center gap-2 text-slate-400 pl-6">
                    <span>Window: +</span>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={fingerprintOutWindowMinutes}
                      onChange={(e) => setFingerprintOutWindowMinutes(Number(e.target.value))}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-center"
                    />
                    <span>minutes after shift end</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Automated Reminders Lead Times */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              Automated Pre-Shift Notifications (minutes before):
            </label>
            <div className="flex flex-wrap gap-2">
              {[120, 60, 45, 30, 15, 5, 0].map((mins) => {
                const active = reminders.includes(mins);
                return (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => toggleReminder(mins)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border transition ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mins === 0 ? 'At Shift Start' : `${mins} min before`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Handover / Clinical Notes */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Clinical Notes &amp; Handover Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ward 4 handover with Dr. Smith, check ICU bed 12 lab results, OR case scheduled at 10:00"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg transition"
            >
              {shiftToEdit ? 'Save Changes' : 'Schedule Shift'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
