import React, { useState } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Volume2,
  Trash2,
  Edit2,
  Bed,
  Check,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { DutyTask, TaskPriority } from '../types';
import { audioAlarm } from '../services/audioAlarm';
import { formatHMTo12 } from '../utils/timeFormat';

interface TasksAndAlarmsProps {
  tasks: DutyTask[];
  onAddNewTask: () => void;
  onEditTask: (task: DutyTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
}

export const TasksAndAlarms: React.FC<TasksAndAlarmsProps> = ({
  tasks,
  onAddNewTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'pending' && t.completed) return false;
    if (filterStatus === 'completed' && !t.completed) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return { label: 'URGENT ALARM', bg: 'bg-red-500/10 text-red-400 border-red-500/30' };
      case 'high':
        return { label: 'HIGH PRIORITY', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      default:
        return { label: 'STANDARD DUTY', bg: 'bg-slate-700/60 text-slate-300 border-slate-600' };
    }
  };

  const handleTestAudio = (sound: DutyTask['alarmSound']) => {
    audioAlarm.playTone(sound, 0.85);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            Duty Alarms &amp; Clinical Tasks
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredTasks.length} Task{filteredTasks.length === 1 ? '' : 's'}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Precision alarms trigger sound, notifications, and repeat alerts until snoozed or verified.
          </p>
        </div>

        <button
          onClick={onAddNewTask}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-semibold text-xs shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Task Alarm
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          {(['pending', 'completed', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-md font-semibold capitalize transition ${
                filterStatus === s
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟡 High Priority</option>
            <option value="normal">🔵 Standard</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm">No clinical tasks found matching current filters.</p>
          <button
            onClick={onAddNewTask}
            className="text-xs text-red-400 font-semibold hover:underline"
          >
            + Add a clinical task alarm
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const badge = getPriorityBadge(task.priority);

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  task.completed
                    ? 'bg-slate-950/40 border-slate-900 opacity-60'
                    : task.priority === 'urgent'
                    ? 'bg-slate-900 border-red-500/40 shadow-md shadow-red-500/5'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                {/* Left side: Checkbox + details */}
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => onToggleTaskComplete(task.id)}
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-700 hover:border-cyan-500 text-transparent hover:text-slate-600 bg-slate-800'
                    }`}
                    title={task.completed ? 'Mark incomplete' : 'Mark task complete'}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {task.patientRoomOrBed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Bed className="w-3 h-3 text-cyan-400" />
                          {task.patientRoomOrBed}
                        </span>
                      )}
                      {task.alarmEnabled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 font-semibold">
                          <Bell className="w-3 h-3" /> Alarm Armed
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-sm font-bold text-white ${
                        task.completed ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {task.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono text-cyan-300 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {task.dueDate} at {formatHMTo12(task.dueTime)}
                      </span>
                      {task.notes && (
                        <span className="text-slate-400 italic line-clamp-1 max-w-sm">
                          "{task.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Audio tone test & Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <button
                    onClick={() => handleTestAudio(task.alarmSound)}
                    title={`Test ${task.alarmSound} sound`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px]">Test Alarm</span>
                  </button>

                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Edit Task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
