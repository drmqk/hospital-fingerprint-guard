import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  UploadCloud,
  DownloadCloud,
  Clock,
  MapPin,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { HospitalShift } from '../types';
import {
  syncShiftToGoogleCalendar,
  fetchCalendarEvents,
  deleteEventFromGoogleCalendar,
  GoogleCalendarEvent,
} from '../services/googleCalendar';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: HospitalShift[];
  onUpdateShift: (shift: HospitalShift) => void;
  onImportShifts: (newShifts: HospitalShift[]) => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  shifts,
  onUpdateShift,
  onImportShifts,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>(shifts.map((s) => s.id));
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedImportEventIds, setSelectedImportEventIds] = useState<string[]>([]);
  
  // Explicit confirmation state for destructive actions per Workspace guidelines
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelectShift = (id: string) => {
    setSelectedShiftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportToGoogleCalendar = async () => {
    const shiftsToSync = shifts.filter((s) => selectedShiftIds.includes(s.id));
    if (shiftsToSync.length === 0) {
      setStatusMessage({ text: 'Please select at least one hospital shift to sync.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    let successCount = 0;
    try {
      for (const shift of shiftsToSync) {
        const eventId = await syncShiftToGoogleCalendar(shift);
        onUpdateShift({
          ...shift,
          googleCalendarEventId: eventId,
          lastSyncedWithGoogle: new Date().toISOString(),
        });
        successCount++;
      }

      setStatusMessage({
        text: `Successfully synced ${successCount} shift(s) to your Google Calendar with automated reminders!`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: `Error syncing to Google Calendar: ${err.message || 'Check your permissions.'}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadCalendarEvents = async () => {
    setIsLoadingEvents(true);
    setStatusMessage(null);
    try {
      const events = await fetchCalendarEvents();
      setCalendarEvents(events);
      // Auto-select events that look like hospital duties
      const likelyIds = events
        .filter((e) => {
          const s = (e.summary || '').toLowerCase();
          return (
            s.includes('shift') ||
            s.includes('duty') ||
            s.includes('hospital') ||
            s.includes('call') ||
            s.includes('clinic') ||
            s.includes('surgery') ||
            s.includes('er') ||
            s.includes('icu')
          );
        })
        .map((e) => e.id);
      setSelectedImportEventIds(likelyIds.length > 0 ? likelyIds : events.slice(0, 5).map((e) => e.id));
    } catch (err: any) {
      setStatusMessage({
        text: `Failed to load Google Calendar events: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleImportSelectedEvents = () => {
    const eventsToImport = calendarEvents.filter((e) => selectedImportEventIds.includes(e.id));
    if (eventsToImport.length === 0) {
      setStatusMessage({ text: 'No events selected to import.', type: 'error' });
      return;
    }

    const newShifts: HospitalShift[] = eventsToImport.map((event, idx) => {
      const startDateTimeStr = event.start?.dateTime || event.start?.date || new Date().toISOString();
      const endDateTimeStr = event.end?.dateTime || event.end?.date || new Date(Date.now() + 8 * 3600000).toISOString();
      
      const startDate = startDateTimeStr.split('T')[0];
      const startTime = startDateTimeStr.includes('T') ? startDateTimeStr.split('T')[1].substring(0, 5) : '08:00';
      const endDate = endDateTimeStr.split('T')[0];
      const endTime = endDateTimeStr.includes('T') ? endDateTimeStr.split('T')[1].substring(0, 5) : '16:00';

      return {
        id: `imported-${event.id}-${Date.now()}-${idx}`,
        title: event.summary || 'Hospital Duty Shift',
        shiftType: 'morning',
        hospitalName: event.location?.split('-')[0]?.trim() || 'Central Hospital',
        department: 'General Duty',
        fingerprintStation: 'Main Kiosk Terminal',
        startDate,
        startTime,
        endDate,
        endTime,
        fingerprintInRequired: true,
        fingerprintOutRequired: true,
        fingerprintInWindowMinutes: 20,
        fingerprintOutWindowMinutes: 30,
        fingerprintInStatus: 'pending',
        fingerprintOutStatus: 'pending',
        remindersMinutesBefore: [60, 30, 15, 0],
        googleCalendarEventId: event.id,
        notes: event.description || '',
      };
    });

    onImportShifts(newShifts);
    setStatusMessage({
      text: `Successfully imported ${newShifts.length} hospital shifts into your radar!`,
      type: 'success',
    });
  };

  const handleDeleteSyncedEvent = async (shift: HospitalShift) => {
    if (!shift.googleCalendarEventId) return;
    setIsProcessing(true);
    try {
      await deleteEventFromGoogleCalendar(shift.googleCalendarEventId);
      onUpdateShift({
        ...shift,
        googleCalendarEventId: undefined,
        lastSyncedWithGoogle: undefined,
      });
      setConfirmDeleteEventId(null);
      setStatusMessage({
        text: `Removed shift event from your Google Calendar.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: `Failed to remove from Google Calendar: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Google Calendar Integration</h3>
              <p className="text-xs text-slate-400">
                Sync hospital shifts, fingerprint alert intervals, and clinical assignments
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

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 mt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 transition ${
              activeTab === 'export'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Export Shifts to Google Calendar ({shifts.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              if (calendarEvents.length === 0) {
                handleLoadCalendarEvents();
              }
            }}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 transition ${
              activeTab === 'import'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            Import Shifts from Calendar
          </button>
        </div>

        {/* Notification Status Banner */}
        {statusMessage && (
          <div
            className={`my-3 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Export Shifts to Google Calendar */}
        {activeTab === 'export' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
              <span>Select shifts to push to your Google Calendar:</span>
              <button
                onClick={() =>
                  setSelectedShiftIds(
                    selectedShiftIds.length === shifts.length ? [] : shifts.map((s) => s.id)
                  )
                }
                className="text-cyan-400 hover:underline"
              >
                {selectedShiftIds.length === shifts.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2">
              {shifts.map((shift) => {
                const isSelected = selectedShiftIds.includes(shift.id);
                const isAlreadySynced = Boolean(shift.googleCalendarEventId);

                return (
                  <div
                    key={shift.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/80 border-cyan-500/50 ring-1 ring-cyan-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectShift(shift.id)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {shift.title}
                          {isAlreadySynced && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              Synced
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 font-mono text-cyan-300">
                            <Clock className="w-3 h-3" />
                            {shift.startDate} ({shift.startTime} - {shift.endTime})
                          </span>
                          <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {shift.hospitalName} • {shift.department}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAlreadySynced && (
                      <button
                        onClick={() => setConfirmDeleteEventId(shift.id)}
                        title="Remove event from Google Calendar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Import from Google Calendar */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Events found on your primary Google Calendar:
              </span>
              <button
                onClick={handleLoadCalendarEvents}
                disabled={isLoadingEvents}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                {isLoadingEvents ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Refresh Calendar
              </button>
            </div>

            {isLoadingEvents ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                <p className="text-xs">Connecting to Google Calendar API...</p>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No events found in this date range. Click Refresh Calendar or add events to your Google Calendar.
              </div>
            ) : (
              <div className="space-y-2">
                {calendarEvents.map((event) => {
                  const isSelected = selectedImportEventIds.includes(event.id);
                  const startStr = event.start?.dateTime || event.start?.date || '';

                  return (
                    <label
                      key={event.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/80 border-cyan-500/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedImportEventIds((prev) =>
                              prev.includes(event.id)
                                ? prev.filter((id) => id !== event.id)
                                : [...prev, event.id]
                            )
                          }
                          className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {event.summary || '(Untitled Event)'}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-cyan-300">
                              {startStr ? new Date(startStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'All Day'}
                            </span>
                            {event.location && (
                              <span className="text-slate-400 truncate max-w-xs">• {event.location}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Close
          </button>

          {activeTab === 'export' ? (
            <button
              onClick={handleExportToGoogleCalendar}
              disabled={isProcessing || selectedShiftIds.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md disabled:opacity-50 flex items-center gap-2 transition"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Confirm &amp; Sync {selectedShiftIds.length} Shift(s) to Calendar
            </button>
          ) : (
            <button
              onClick={handleImportSelectedEvents}
              disabled={selectedImportEventIds.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md disabled:opacity-50 flex items-center gap-2 transition"
            >
              <DownloadCloud className="w-4 h-4" />
              Import {selectedImportEventIds.length} Selected Shift(s)
            </button>
          )}
        </div>

        {/* Destructive Confirmation Modal for Workspace API Deletion */}
        {confirmDeleteEventId && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 rounded-2xl">
            <div className="bg-slate-900 border border-red-500/50 p-5 rounded-xl max-w-md w-full space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                Remove Event from Google Calendar?
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will delete the synchronized calendar entry from your Google Calendar account. The shift will remain preserved in your local Hospital Duty Guard records.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteEventId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const shift = shifts.find((s) => s.id === confirmDeleteEventId);
                    if (shift) handleDeleteSyncedEvent(shift);
                  }}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Delete from Calendar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
