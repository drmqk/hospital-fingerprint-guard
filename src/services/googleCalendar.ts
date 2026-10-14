import { HospitalShift } from '../types';
import { getAccessToken } from './firebaseAuth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface CalendarEventPayload {
  id?: string;
  summary: string;
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides: Array<{
      method: 'popup' | 'email';
      minutes: number;
    }>;
  };
  colorId?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

/**
 * Fetch calendar events within a time range
 */
export async function fetchCalendarEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google to sync calendar.');
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const defaultMin = timeMin || new Date(now.getTime() - 7 * 86400000).toISOString();
  const defaultMax = timeMax || new Date(now.getTime() + 30 * 86400000).toISOString();

  const url = new URL(CALENDAR_API_BASE);
  url.searchParams.set('timeMin', defaultMin);
  url.searchParams.set('timeMax', defaultMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('timeZone', userTimeZone);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleCalendarEvent[];
}

/**
 * Converts a HospitalShift into a Google Calendar event payload
 */
export function shiftToCalendarPayload(shift: HospitalShift): CalendarEventPayload {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create start and end ISO strings with timezone
  const startDateTime = new Date(`${shift.startDate}T${shift.startTime}:00`).toISOString();
  const endDateTime = new Date(`${shift.endDate}T${shift.endTime}:00`).toISOString();

  const reminderOverrides = (shift.remindersMinutesBefore || [60, 30, 15]).map(mins => ({
    method: 'popup' as const,
    minutes: mins,
  }));

  const descriptionLines = [
    `🏥 Hospital: ${shift.hospitalName}`,
    `🏢 Department: ${shift.department}`,
    `📍 Biometric Fingerprint Station: ${shift.fingerprintStation}`,
    ``,
    `⏰ MANDATORY FINGERPRINT INSTRUCTION:`,
    shift.fingerprintInRequired 
      ? `• Fingerprint Clock-In required around ${shift.startTime} (Window: ±${shift.fingerprintInWindowMinutes} min)`
      : `• Fingerprint In: Not required`,
    shift.fingerprintOutRequired 
      ? `• Fingerprint Clock-Out required around ${shift.endTime} (Window: +${shift.fingerprintOutWindowMinutes} min)`
      : `• Fingerprint Out: Not required`,
    ``,
    shift.notes ? `📝 Clinical Notes / Handover:\n${shift.notes}` : '',
    `\n---\nSynced automatically via Hospital Duty & Fingerprint Alarm Guard`,
  ].filter(Boolean).join('\n');

  return {
    summary: `🏥 [Hospital Shift] ${shift.title} (${shift.department})`,
    description: descriptionLines,
    location: `${shift.hospitalName} - ${shift.fingerprintStation}${shift.locationDetails ? ` (${shift.locationDetails})` : ''}`,
    start: {
      dateTime: startDateTime,
      timeZone: userTimeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: userTimeZone,
    },
    reminders: {
      useDefault: false,
      overrides: reminderOverrides.length > 0 ? reminderOverrides : [{ method: 'popup', minutes: 30 }],
    },
    // Calendar color IDs: 11 = red (on-call/high-intensity), 9 = blueberry, 7 = peacock
    colorId: shift.shiftType === 'night' || shift.shiftType === '24h_duty' ? '11' : '7',
  };
}

/**
 * Creates or updates a shift in Google Calendar
 */
export async function syncShiftToGoogleCalendar(shift: HospitalShift): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google to sync calendar.');
  }

  const payload = shiftToCalendarPayload(shift);

  let url = CALENDAR_API_BASE;
  let method = 'POST';

  if (shift.googleCalendarEventId) {
    url = `${CALENDAR_API_BASE}/${encodeURIComponent(shift.googleCalendarEventId)}`;
    method = 'PUT';
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // If the event was deleted on Google Calendar, fallback to creating a new one
    if (res.status === 404 && shift.googleCalendarEventId) {
      return syncShiftToGoogleCalendar({ ...shift, googleCalendarEventId: undefined });
    }
    const err = await res.text();
    throw new Error(`Failed to sync shift to Google Calendar (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Delete an event from Google Calendar
 * Note: Workspace integrations require explicit user confirmation before destructive actions.
 */
export async function deleteEventFromGoogleCalendar(eventId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  const res = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const err = await res.text();
    throw new Error(`Failed to delete event from Google Calendar: ${err}`);
  }
}
