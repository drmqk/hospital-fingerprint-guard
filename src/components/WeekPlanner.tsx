import React from 'react';
import { MonthPlanner } from './MonthPlanner';
import { HospitalShift, UserProfile } from '../types';
import { Language } from '../utils/i18n';

interface WeekPlannerProps {
  profile: UserProfile;
  onApplyWeekShifts: (shifts: HospitalShift[]) => void;
  onOpenCalendarSync: () => void;
  isCalendarConnected: boolean;
  language?: Language;
}

export const WeekPlanner: React.FC<WeekPlannerProps> = ({
  profile,
  onApplyWeekShifts,
  onOpenCalendarSync,
  isCalendarConnected,
  language = profile.language || 'en',
}) => {
  return (
    <MonthPlanner
      profile={profile}
      onApplyMonthShifts={onApplyWeekShifts}
      onOpenCalendarSync={onOpenCalendarSync}
      isCalendarConnected={isCalendarConnected}
      language={language}
    />
  );
};

export { MonthPlanner };
