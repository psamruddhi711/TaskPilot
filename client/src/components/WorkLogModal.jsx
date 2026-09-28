import React, { useState, useEffect } from 'react';
import { projectAPI, timesheetAPI } from '../services/api';
import { X, Clock, Calendar, FolderKanban, CheckSquare, AlertCircle, Sparkles, Tag, FileText } from 'lucide-react';

const CATEGORIES = [
  'Development',
  'Testing',
  'Bug Fixing',
  'Meeting',
  'Documentation',
  'Research',
  'Code Review',
  'Other'
];

export const WorkLogModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingEntry = null,
  defaultDate = new Date().toISOString().split('T')[0]
}) => {
  const [projects, setProjects] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [workDate, setWorkDate] = useState(defaultDate);
  const [workDescription, setWorkDescription] = useState('');
  const [workCategory, setWorkCategory] = useState('Development');
  const [useTimeRange, setUseTimeRange] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [hoursWorked, setHoursWorked] = useState('7.0');
  const [remarks, setRemarks] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Projects on Open
  useEffect(() => {
    if (isOpen) {
      setError('');
      loadProjects();

      if (editingEntry) {
        setProjectId(editingEntry.project_id ? String(editingEntry.project_id) : '');
        setTaskId(editingEntry.task_id ? String(editingEntry.task_id) : '');
        setWorkDate(editingEntry.work_date || defaultDate);
        setWorkDescription(editingEntry.work_description || '');
        setWorkCategory(editingEntry.work_category || 'Development');
        setRemarks(editingEntry.remarks || '');
        setHoursWorked(String(editingEntry.hours_worked || ''));

        if (editingEntry.start_time && editingEntry.end_time) {
          setUseTimeRange(true);
          setStartTime(editingEntry.start_time);
          setEndTime(editingEntry.end_time);
          setBreakMinutes(editingEntry.break_minutes || 0);
        } else {
          setUseTimeRange(false);
        }
      } else {
        setWorkDate(defaultDate);
        setWorkDescription('');
        setWorkCategory('Development');
        setRemarks('');
        setUseTimeRange(true);
        setStartTime('09:00');
        setEndTime('17:00');
        setBreakMinutes(60);
        setHoursWorked('7.0');
      }
    }
  }, [isOpen, editingEntry, defaultDate]);

  // Fetch Projects
  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await projectAPI.getProjects();
      const list = res.data || [];
      setProjects(list);
      if (list.length > 0 && !editingEntry && !projectId) {
        setProjectId(String(list[0].id));
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Unable to load assigned projects.');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch Tasks whenever projectId changes
  useEffect(() => {
    if (projectId) {
      loadProjectTasks(projectId);
    } else {
      setProjectTasks([]);
      setTaskId('');
    }
  }, [projectId]);

  const loadProjectTasks = async (pId) => {
    try {
      setLoadingTasks(true);
      const res = await projectAPI.getProjectTasks(pId);
      const tasks = res.data || [];
      setProjectTasks(tasks);

      // If current taskId doesn't belong to new project tasks, reset
      if (editingEntry && String(editingEntry.project_id) === String(pId)) {
        setTaskId(editingEntry.task_id ? String(editingEntry.task_id) : '');
      } else if (tasks.length > 0) {
        setTaskId(String(tasks[0].id));
      } else {
        setTaskId('');
      }
    } catch (err) {
      console.error('Failed to load project tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Auto calculate hours worked when start/end/break changes
  useEffect(() => {
    if (useTimeRange && startTime && endTime) {
      try {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        if (endMin > startMin) {
          const netMin = endMin - startMin - (parseInt(breakMinutes, 10) || 0);
          if (netMin > 0) {
            setHoursWorked((netMin / 60).toFixed(2));
          } else {
            setHoursWorked('0');
          }
        } else {
          setHoursWorked('0');
        }
      } catch {
        // ignore format errors during typing
      }
    }
  }, [useTimeRange, startTime, endTime, breakMinutes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!projectId) {
      setError('Please select an assigned project.');
      return;
    }

    if (!workDescription.trim()) {
      setError('Please provide a brief description of the work performed.');
      return;
    }

    const numericHours = parseFloat(hoursWorked);
    if (isNaN(numericHours) || numericHours <= 0) {
      setError('Please provide a valid number of hours worked (greater than 0).');
      return;
    }

    if (numericHours > 24) {
      setError('Hours worked cannot exceed 24 hours in a single log.');
      return;
    }

    if (useTimeRange) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      if (endH * 60 + endM <= startH * 60 + startM) {
        setError('End time must be after start time.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        project_id: parseInt(projectId, 10),
        task_id: taskId ? parseInt(taskId, 10) : null,
        work_date: workDate,
        work_description: workDescription.trim(),
        work_category: workCategory,
        start_time: useTimeRange ? startTime : null,
        end_time: useTimeRange ? endTime : null,
        break_minutes: useTimeRange ? parseInt(breakMinutes, 10) || 0 : 0,
        hours_worked: numericHours,
        remarks: remarks.trim() || null
      };

      if (editingEntry) {
        await timesheetAPI.updateEntry(editingEntry.id, payload);
      } else {
        await timesheetAPI.createEntry(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Save entry error:', err);
      setError(err.message || 'Failed to save work log entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xl transition-colors my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/50">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">
                {editingEntry ? 'Edit Work Log Entry' : 'Record Daily Work Log'}
              </h2>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                Log time spent on assigned project tasks with activity details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Date & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                <span>Work Date *</span>
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                <span>Project *</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={loadingProjects}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Task & Work Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                <span>Task (Optional / Assigned)</span>
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={loadingTasks}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
              >
                <option value="">-- General Project Work (No Specific Task) --</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                <span>Work Category *</span>
              </label>
              <select
                value={workCategory}
                onChange={(e) => setWorkCategory(e.target.value)}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Logging Mode Switch */}
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#202124] dark:text-[#F3F4F6]">Time Tracking Mode</span>
              <div className="flex items-center gap-1 bg-white dark:bg-[#25292E] p-0.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                <button
                  type="button"
                  onClick={() => setUseTimeRange(true)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    useTimeRange
                      ? 'bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-[#818CF8]'
                      : 'text-[#6B7280] dark:text-[#A1A1AA]'
                  }`}
                >
                  Start / End Times
                </button>
                <button
                  type="button"
                  onClick={() => setUseTimeRange(false)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    !useTimeRange
                      ? 'bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-[#818CF8]'
                      : 'text-[#6B7280] dark:text-[#A1A1AA]'
                  }`}
                >
                  Direct Hours
                </button>
              </div>
            </div>

            {useTimeRange ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mb-0.5">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-2 py-1 text-xs text-[#202124] dark:text-[#F3F4F6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mb-0.5">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-2 py-1 text-xs text-[#202124] dark:text-[#F3F4F6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mb-0.5">Break (mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    className="w-full rounded border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-2 py-1 text-xs text-[#202124] dark:text-[#F3F4F6]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mb-0.5">Total Hours Worked *</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  max="24"
                  required
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="e.g. 7.5"
                  className="w-full rounded border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-3 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6]"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-[11px] border-t border-[#E5E7EB] dark:border-[#30343A]">
              <span className="text-[#6B7280] dark:text-[#A1A1AA]">Calculated Total Workload:</span>
              <span className="font-bold text-[#4F46E5] dark:text-[#818CF8] text-xs">
                {hoursWorked || 0} Hours
              </span>
            </div>
          </div>

          {/* Work Description */}
          <div>
            <label className="mb-1 block font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <span>Work Description (What was completed?) *</span>
            </label>
            <textarea
              required
              rows={3}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="e.g. Developed API endpoints for monthly timesheet calculation and validated unit tests."
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] p-2.5 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
            />
          </div>

          {/* Optional Remarks */}
          <div>
            <label className="mb-1 block font-medium text-[#4B5563] dark:text-[#D1D5DB]">
              Remarks / Blockers Encountered (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Paired with Sarah on schema migration"
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB] dark:border-[#30343A]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3.5 py-1.5 text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:bg-gray-50 dark:hover:bg-[#25292E] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingEntry ? 'Update Work Log' : 'Save Work Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkLogModal;
