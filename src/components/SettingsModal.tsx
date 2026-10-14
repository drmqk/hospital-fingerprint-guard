import React, { useState } from 'react';
import {
  X,
  Settings,
  Volume2,
  Bell,
  Building2,
  Fingerprint,
  User,
  ShieldCheck,
  Check,
  Clock,
} from 'lucide-react';
import { UserProfile } from '../types';
import { audioAlarm } from '../services/audioAlarm';
import { NotificationService } from '../services/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.title);
  const [hospitalName, setHospitalName] = useState(profile.hospitalName);
  const [defaultDepartment, setDefaultDepartment] = useState(profile.defaultDepartment);
  const [defaultFingerprintStation, setDefaultFingerprintStation] = useState(profile.defaultFingerprintStation);
  const [alarmVolume, setAlarmVolume] = useState(profile.alarmVolume);
  const [alarmTone, setAlarmTone] = useState(profile.alarmTone);
  const [enableSoundAlarms, setEnableSoundAlarms] = useState(profile.enableSoundAlarms);
  const [enableBrowserNotifications, setEnableBrowserNotifications] = useState(profile.enableBrowserNotifications);
  const [reminderIntervals, setReminderIntervals] = useState<number[]>(profile.reminderIntervals || [60, 30, 15, 0]);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(profile.timeFormat || '12h');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleInterval = (min: number) => {
    setReminderIntervals((prev) =>
      prev.includes(min) ? prev.filter((m) => m !== min) : [...prev, min].sort((a, b) => b - a)
    );
  };

  const handleTestAlarmTone = (toneToTest?: typeof alarmTone) => {
    const tone = toneToTest || alarmTone;
    audioAlarm.setVolume(alarmVolume);
    audioAlarm.playTone(tone, alarmVolume);
  };

  const handleTestNotification = async () => {
    const perm = await NotificationService.requestPermission();
    if (perm === 'granted') {
      NotificationService.notify(
        '🔔 Fingerprint Radar Reminder (Test)',
        `Your shift at ${hospitalName} starts in 30 minutes. Report to ${defaultFingerprintStation}.`,
        { sound: alarmTone }
      );
    } else {
      alert('Notification permissions are blocked in your browser settings. Please allow notifications.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name,
      title,
      hospitalName,
      defaultDepartment,
      defaultFingerprintStation,
      alarmVolume,
      alarmTone,
      enableSoundAlarms,
      enableBrowserNotifications,
      reminderIntervals,
      timeFormat,
    };

    audioAlarm.setVolume(enableSoundAlarms ? alarmVolume : 0);
    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Hospital &amp; Notification Settings</h3>
              <p className="text-xs text-slate-400">
                Configure your physician profile, biometric kiosks, and alarm thresholds
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
          
          {/* Physician Profile */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-400" /> Physician &amp; Hospital Credentials
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Full Name &amp; Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Role / Speciality</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Hospital / Medical Center</label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Primary Department</label>
                <input
                  type="text"
                  required
                  value={defaultDepartment}
                  onChange={(e) => setDefaultDepartment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" /> Primary Biometric Fingerprint Station
              </label>
              <input
                type="text"
                required
                value={defaultFingerprintStation}
                onChange={(e) => setDefaultFingerprintStation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>
          </div>

          {/* Audio Alarm Synthesizer Settings */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" /> Hospital Alarm Synthesizer
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableSoundAlarms}
                  onChange={(e) => setEnableSoundAlarms(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 w-4 h-4"
                />
                <span>Enable Sound</span>
              </label>
            </div>

            {enableSoundAlarms && (
              <>
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Master Alarm Volume</span>
                    <span className="font-mono text-cyan-300 font-semibold">{Math.round(alarmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={alarmVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setAlarmVolume(v);
                      audioAlarm.setVolume(v);
                    }}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5">Default Duty Alert Sound:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'hospital_pager', label: 'Hospital Pager' },
                      { id: 'code_urgent', label: 'Code Urgent' },
                      { id: 'chime_alert', label: 'Duty Chime' },
                      { id: 'radar_pulse', label: 'Radar Ping' },
                    ].map((tone) => (
                      <button
                        type="button"
                        key={tone.id}
                        onClick={() => {
                          setAlarmTone(tone.id as any);
                          handleTestAlarmTone(tone.id as any);
                        }}
                        className={`p-2 rounded-lg border text-center transition ${
                          alarmTone === tone.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-white font-semibold'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Automated Shift Reminders */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-cyan-400" /> Default Pre-Shift Reminder Intervals
              </span>
              <button
                type="button"
                onClick={handleTestNotification}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                Send Test Push Notification
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[120, 60, 45, 30, 15, 5, 0].map((mins) => {
                const active = reminderIntervals.includes(mins);
                return (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => toggleInterval(mins)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border transition ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {mins === 0 ? 'Shift Start' : `${mins} min before`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time System Selector (12h AM/PM vs 24h) */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" /> Time Display System
              </span>
              <span className="text-[11px] text-slate-400">Preferred clock format</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTimeFormat('12h')}
                className={`p-3 rounded-xl border text-left transition ${
                  timeFormat === '12h'
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>12-Hour System (AM/PM)</span>
                  {timeFormat === '12h' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">e.g. 08:00 AM, 02:30 PM, 11:45 PM</div>
              </button>

              <button
                type="button"
                onClick={() => setTimeFormat('24h')}
                className={`p-3 rounded-xl border text-left transition ${
                  timeFormat === '24h'
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>24-Hour System</span>
                  {timeFormat === '24h' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">e.g. 08:00, 14:30, 23:45</div>
              </button>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Settings updated successfully
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
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
                Save Preferences
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
