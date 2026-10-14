import React, { useEffect } from 'react';
import { AlertTriangle, Bell, Clock, Fingerprint, Volume2, X, CheckCircle, Bed } from 'lucide-react';
import { ActiveAlarmState } from '../types';
import { audioAlarm } from '../services/audioAlarm';

interface ActiveAlarmModalProps {
  alarm: ActiveAlarmState | null;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onActionComplete: () => void;
}

export const ActiveAlarmModal: React.FC<ActiveAlarmModalProps> = ({
  alarm,
  onDismiss,
  onSnooze,
  onActionComplete,
}) => {
  useEffect(() => {
    if (alarm) {
      // Start persistent repeating medical pager alarm
      audioAlarm.startPersistentAlarm(alarm.soundType || 'hospital_pager');
    }
    return () => {
      audioAlarm.stopAlarm();
    };
  }, [alarm]);

  if (!alarm) return null;

  const isFingerprint = alarm.type === 'fingerprint_in' || alarm.type === 'fingerprint_out';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.3)] p-6 text-white overflow-hidden">
        
        {/* Pulsing red emergency strobe light line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-pulse" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 animate-bounce">
              {isFingerprint ? <Fingerprint className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500 text-white shadow-sm mb-1">
                {isFingerprint ? 'MANDATORY BIOMETRIC ALARM' : 'CLINICAL DUTY TASK ALARM'}
              </span>
              <h3 className="text-xl font-extrabold text-white leading-tight">
                {alarm.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Silence & Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle / Department / Clinical context */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-200">
          <div className="flex items-center gap-2 font-medium text-amber-300">
            <Clock className="w-4 h-4" />
            <span>Time Trigger: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="mt-1.5 text-slate-300">{alarm.subtitle}</p>
        </div>

        {/* Alarm audio is actively ringing indicator */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-red-400 font-medium">
            <Volume2 className="w-4 h-4 animate-pulse" />
            Continuous alarm ringing until action or snooze
          </span>
          <button
            onClick={() => audioAlarm.stopAlarm()}
            className="text-slate-400 hover:text-slate-200 underline"
          >
            Mute Sound
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {/* Main Action (e.g. Verify Fingerprint Now or Mark Task Done) */}
          <button
            onClick={() => {
              audioAlarm.stopAlarm();
              onActionComplete();
            }}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
          >
            <CheckCircle className="w-5 h-5" />
            {isFingerprint ? 'Verify Biometric Punch & Complete' : 'Mark Task Completed'}
          </button>

          {/* Snooze options row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                audioAlarm.stopAlarm();
                onSnooze(5);
              }}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition text-center"
            >
              Snooze 5 Min
            </button>
            <button
              onClick={() => {
                audioAlarm.stopAlarm();
                onSnooze(10);
              }}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition text-center"
            >
              Snooze 10 Min
            </button>
            <button
              onClick={() => {
                audioAlarm.stopAlarm();
                onDismiss();
              }}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700 transition text-center"
            >
              Dismiss
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
