/**
 * Centralized Time Formatting Utility
 * Supports 12-hour system (with AM/PM) and optional 24-hour system.
 * Defaults to 12-hour AM/PM format.
 */

export type TimeFormatMode = '12h' | '24h';

/**
 * Converts HH:mm (24h input from time pickers) into 12-hour format with AM/PM
 * Example: "08:00" -> "08:00 AM", "14:30" -> "02:30 PM", "00:15" -> "12:15 AM"
 */
export function formatHMTo12(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr.substring(0, 2);

  if (isNaN(hours)) return time24;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12 AM
  const hoursFormatted = String(hours).padStart(2, '0');

  return `${hoursFormatted}:${minutes} ${ampm}`;
}

/**
 * Formats a Date object into HH:mm with AM/PM (or 24h if mode is '24h')
 */
export function formatTime(date: Date, mode: TimeFormatMode = '12h'): string {
  if (mode === '24h') {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursFormatted = String(hours).padStart(2, '0');

  return `${hoursFormatted}:${minutes} ${ampm}`;
}

/**
 * Formats Date to readable string with Day, Date, and 12-hour AM/PM time
 * Example: "Mon Oct 14, 08:00 AM"
 */
export function formatDateTime12(date: Date): string {
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = formatTime(date, '12h');
  return `${weekday} ${monthDay}, ${time}`;
}

/**
 * Returns a human-friendly period label based on hour (e.g. "Morning", "Afternoon", "Evening", "Night")
 */
export function getTimeOfDayLabel(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}
