import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Calendar,
  Clock,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Fingerprint,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { audioAlarm } from '../services/audioAlarm';
import { NotificationService } from '../services/notificationService';
import { UserProfile } from '../types';
import { Language, translations } from '../utils/i18n';

interface HeaderProps {
  user: User | null;
  userToken: string | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  profile: UserProfile;
  onOpenSettings: () => void;
  onOpenCalendarSync: () => void;
  isSyncingCalendar: boolean;
  activeAlarmsCount: number;
  onToggleTimeFormat?: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  userToken,
  onAuthChange,
  profile,
  onOpenSettings,
  onOpenCalendarSync,
  isSyncingCalendar,
  activeAlarmsCount,
  onToggleTimeFormat,
  language,
  onToggleLanguage,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.getPermission()
  );
  const [soundEnabled, setSoundEnabled] = useState(profile.enableSoundAlarms);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const is12Hour = (profile.timeFormat || '12h') === '12h';

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, res.accessToken);
        NotificationService.notify(
          'Google Calendar Connected',
          'Your hospital shifts can now be synchronized automatically.',
          { sound: 'chime_alert' }
        );
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onAuthChange(null, null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await NotificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      NotificationService.notify(
        'Hospital Notifications Active',
        'You will receive biometric fingerprint reminders and duty alerts.',
        { sound: 'chime_alert' }
      );
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioAlarm.setVolume(next ? profile.alarmVolume : 0);
    if (next) {
      audioAlarm.playTone('radar_pulse', profile.alarmVolume);
    }
  };

  const handleQuickAlarmTest = () => {
    audioAlarm.playTone(profile.alarmTone, profile.alarmVolume);
  };

  const t = translations[language] || translations.en;

  const formattedDate = currentTime.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour12: is12Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Hospital Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white font-bold ring-1 ring-white/20 shrink-0">
              <Fingerprint className="w-6 h-6 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  {t.appTitle}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                    {t.radarBadge}
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                {profile.hospitalName} • {profile.defaultDepartment}
              </p>
            </div>
          </div>

          {/* Hospital Live Clock Display (12h AM/PM default with 12h/24h toggle) */}
          <div className="hidden lg:flex flex-col items-center justify-center bg-slate-800/80 border border-slate-700/60 px-4 py-1.5 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-300 font-mono text-base font-semibold tracking-wider">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{formattedTime}</span>
              {onToggleTimeFormat && (
                <button
                  onClick={onToggleTimeFormat}
                  title={t.toggleTimeFormat}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-sans font-semibold border border-slate-600 transition ml-1"
                >
                  {is12Hour ? '12h AM/PM' : '24h'}
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">{formattedDate}</div>
          </div>

          {/* Controls, Language Switcher, Calendar Integration, and Profile */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Optional Complete Arabic Interface Toggle at Top */}
            <button
              onClick={onToggleLanguage}
              title={language === 'ar' ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 active:scale-95 cursor-pointer"
            >
              <span className="text-sm">{language === 'ar' ? '🇸🇦' : '🌐'}</span>
              <span>{language === 'ar' ? 'العربية' : 'English'}</span>
            </button>

            {/* Quick Alarm Audio Test Button */}
            <button
              onClick={handleQuickAlarmTest}
              title={t.testPager}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.testPager}</span>
            </button>

            {/* Mute/Sound Toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Alarms' : 'Unmute Alarms'}
              className={`p-2 rounded-lg border transition ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notifications Permission Button */}
            <button
              onClick={handleRequestNotifications}
              title={
                notificationPermission === 'granted'
                  ? 'Notifications active'
                  : 'Enable automated shift & fingerprint notifications'
              }
              className={`p-2 rounded-lg border transition relative ${
                notificationPermission === 'granted'
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-bounce'
              }`}
            >
              {notificationPermission === 'granted' ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4 text-amber-400" />
              )}
              {notificationPermission !== 'granted' && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>

            {/* Google Calendar OAuth Sign-in & Sync */}
            {user && userToken ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenCalendarSync}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium transition"
                  title="Google Calendar Synced"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Google Calendar</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                </button>

                <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-semibold">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'D'}
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    title="Disconnect Google Account"
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Official "Sign in with Google" button styling per Workspace skill requirements */
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="gsi-material-button flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition border border-slate-200 disabled:opacity-60"
                title="Connect Google Calendar to synchronize your hospital shifts"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span className="hidden sm:inline">{isLoggingIn ? 'Connecting...' : 'Sync Calendar'}</span>
                <span className="sm:hidden">{isLoggingIn ? '...' : 'Sync'}</span>
              </button>
            )}

            {/* App Settings Modal Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Hospital & Reminder Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
