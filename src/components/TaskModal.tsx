import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  AlertTriangle,
  Volume2,
  Bed,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { DutyTask, TaskCategory, TaskPriority, HospitalShift } from '../types';
import { audioAlarm } from '../services/audioAlarm';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: DutyTask) => void;
  taskToEdit?: DutyTask | null;
  shifts: HospitalShift[];
}

const TASK_PRESETS = [
  {
    title: 'Fingerprint Punch Verification',
    category: 'fingerprint_check' as TaskCategory,
    priority: 'urgent' as TaskPriority,
    sound: 'hospital_pager' as const,
    notes: 'Verify biometric attendance kiosk before shift window closes.',
  },
  {
    title: 'Stat Post-Op Surgical Rounds',
    category: 'patient_rounding' as TaskCategory,
    priority: 'urgent' as TaskPriority,
    sound: 'code_urgent' as const,
    notes: 'Inspect surgical wound, vital signs, drain outputs, and pain control.',
  },
  {
    title: 'Review Urgent ABG / Blood Gas Labs',
    category: 'lab_review' as TaskCategory,
    priority: 'high' as TaskPriority,
    sound: 'radar_pulse' as const,
    notes: 'Check arterial blood gas, electrolyte panel, and renal profile.',
  },
  {
    title: 'Time-Critical IV Antibiotics Administration',
    category: 'medication' as TaskCategory,
    priority: 'high' as TaskPriority,
    sound: 'hospital_pager' as const,
    notes: 'Administer scheduled broad-spectrum IV antibiotic dose on time.',
  },
  {
    title: 'Shift Clinical Handover to On-Call Doctor',
    category: 'handover' as TaskCategory,
    priority: 'high' as TaskPriority,
    sound: 'chime_alert' as const,
    notes: 'Structured SBAR handover of high-acuity ward and ICU patients.',
  },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  taskToEdit,
  shifts,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('patient_rounding');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState(todayStr);
  const [dueTime, setDueTime] = useState('14:00');
  const [shiftId, setShiftId] = useState<string>(shifts[0]?.id || '');
  const [patientRoomOrBed, setPatientRoomOrBed] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmSound, setAlarmSound] = useState<'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse'>('hospital_pager');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setCategory(taskToEdit.category);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.dueDate);
      setDueTime(taskToEdit.dueTime);
      setShiftId(taskToEdit.shiftId || (shifts[0]?.id || ''));
      setPatientRoomOrBed(taskToEdit.patientRoomOrBed || '');
      setAlarmEnabled(taskToEdit.alarmEnabled);
      setAlarmSound(taskToEdit.alarmSound);
      setNotes(taskToEdit.notes || '');
    } else {
      // Default to 1 hour from now
      const inOneHour = new Date(Date.now() + 3600000);
      const hours = inOneHour.getHours().toString().padStart(2, '0');
      const minutes = inOneHour.getMinutes().toString().padStart(2, '0');

      setTitle('Fingerprint Attendance Clock-In Check');
      setCategory('fingerprint_check');
      setPriority('urgent');
      setDueDate(todayStr);
      setDueTime(`${hours}:${minutes}`);
      setShiftId(shifts[0]?.id || '');
      setPatientRoomOrBed('');
      setAlarmEnabled(true);
      setAlarmSound('hospital_pager');
      setNotes('Ensure biometric terminal scanner confirms green light.');
    }
  }, [taskToEdit, isOpen, todayStr, shifts]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof TASK_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setPriority(preset.priority);
    setAlarmSound(preset.sound);
    setNotes(preset.notes);
  };

  const handleTestSound = () => {
    audioAlarm.playTone(alarmSound, 0.9);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: DutyTask = {
      id: taskToEdit ? taskToEdit.id : `task-${Date.now()}`,
      shiftId: shiftId || undefined,
      title: title.trim() || 'Clinical Duty Task',
      category,
      priority,
      dueDate,
      dueTime,
      completed: taskToEdit ? taskToEdit.completed : false,
      completedAt: taskToEdit?.completedAt,
      alarmEnabled,
      alarmSound,
      notes: notes.trim(),
      patientRoomOrBed: patientRoomOrBed.trim(),
    };

    onSaveTask(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {taskToEdit ? 'Edit Task Alarm' : 'Schedule Important Task & Alarm'}
              </h3>
              <p className="text-xs text-slate-400">
                Trigger loud hospital audio alarms and browser notifications at exact times
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
          
          {/* Quick Presets */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Task Presets:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TASK_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.title}
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium transition"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Task Description *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Check post-op ABG labs for Bed 12"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          {/* Category, Priority, Shift Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="fingerprint_check">Fingerprint Attendance</option>
                <option value="patient_rounding">Patient Rounding</option>
                <option value="medication">Medication / IV Dose</option>
                <option value="lab_review">Lab &amp; Radiology Review</option>
                <option value="handover">Clinical Handover</option>
                <option value="procedure">Bedside Procedure</option>
                <option value="other">General Task</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="urgent" className="text-red-400 font-bold">🔴 Urgent (Immediate)</option>
                <option value="high" className="text-amber-400 font-bold">🟡 High (Important)</option>
                <option value="normal" className="text-slate-300">🔵 Normal Duty</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Assigned Shift</label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">General (No Shift)</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.startTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Timing & Room/Bed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Due Time (24h)</label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-slate-400" /> Room / Bed (Optional)
              </label>
              <input
                type="text"
                value={patientRoomOrBed}
                onChange={(e) => setPatientRoomOrBed(e.target.value)}
                placeholder="e.g. ICU Bed 4B / Ward 402"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Alarm Audio Settings */}
          <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={alarmEnabled}
                  onChange={(e) => setAlarmEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 w-4 h-4"
                />
                <span>Arm Audio Alarm When Time Reached</span>
              </label>

              <button
                type="button"
                onClick={handleTestSound}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Play Sample Tone
              </button>
            </div>

            {alarmEnabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'hospital_pager', label: 'Hospital Pager', desc: 'Classic double burst' },
                  { id: 'code_urgent', label: 'Code Urgent', desc: 'Medical alert beep' },
                  { id: 'chime_alert', label: 'Duty Chime', desc: 'Pleasant 3-note chime' },
                  { id: 'radar_pulse', label: 'Radar Ping', desc: 'Biometric pulse' },
                ].map((tone) => (
                  <button
                    type="button"
                    key={tone.id}
                    onClick={() => {
                      setAlarmSound(tone.id as any);
                      audioAlarm.playTone(tone.id as any, 0.8);
                    }}
                    className={`p-2 rounded-lg border text-left transition ${
                      alarmSound === tone.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-xs">{tone.label}</div>
                    <div className="text-[10px] text-slate-400">{tone.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Clinical Instructions &amp; Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Notify Dr. Alkenawy if serum potassium exceeds 5.2 mEq/L"
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
              {taskToEdit ? 'Save Task' : 'Schedule Task & Alarm'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
