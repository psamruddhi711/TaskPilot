import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckSquare, AlertCircle, AlertTriangle, User, Calendar, Clock, GitCommit, Check } from 'lucide-react';
import { taskAPI, projectAPI } from '../services/api';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'];

export const TaskModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  defaultProjectId = null,
  projects = [],
  projectMembers = []
}) => {
  const isEditing = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState({
    project_id: defaultProjectId || '',
    title: '',
    description: '',
    assigned_to: '',
    estimated_hours: 0,
    priority: 'Medium',
    status: 'To Do',
    start_date: '',
    due_date: '',
    depends_on: []
  });

  const [availableProjectTasks, setAvailableProjectTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(null);

  // Fetch candidate tasks for "depends on" multi-select
  useEffect(() => {
    const selectedProjId = formData.project_id || defaultProjectId;
    if (selectedProjId) {
      projectAPI
        .getProjectTasks(selectedProjId)
        .then((res) => {
          if (res.success) {
            // Filter out current task if editing
            const candidates = isEditing
              ? res.data.filter((t) => t.id !== initialData.id)
              : res.data;
            setAvailableProjectTasks(candidates);
          }
        })
        .catch((err) => console.warn('Could not fetch candidate tasks:', err.message));
    }
  }, [formData.project_id, defaultProjectId, isEditing, initialData]);

  useEffect(() => {
    if (initialData) {
      const initialDeps = (initialData.predecessors || []).map((p) => p.id);
      setFormData({
        project_id: initialData.project_id || defaultProjectId || '',
        title: initialData.title || '',
        description: initialData.description || '',
        assigned_to: initialData.assigned_to || '',
        estimated_hours: initialData.estimated_hours || 0,
        priority: initialData.priority || 'Medium',
        status: initialData.status || 'To Do',
        start_date: initialData.start_date || '',
        due_date: initialData.due_date || '',
        depends_on: initialDeps
      });
    } else {
      setFormData({
        project_id: defaultProjectId || (projects[0]?.id || ''),
        title: '',
        description: '',
        assigned_to: '',
        estimated_hours: 0,
        priority: 'Medium',
        status: 'To Do',
        start_date: '',
        due_date: '',
        depends_on: []
      });
    }
    setError('');
    setWarning(null);
  }, [initialData, defaultProjectId, projects, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'estimated_hours' ? parseFloat(value) || 0 : value
    }));
    setError('');
    setWarning(null);
  };

  const handleToggleDependency = (taskId) => {
    setFormData((prev) => {
      const current = prev.depends_on || [];
      const exists = current.includes(taskId);
      return {
        ...prev,
        depends_on: exists ? current.filter((id) => id !== taskId) : [...current, taskId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!formData.project_id) {
      setError('Please select a project for this task.');
      return;
    }

    setLoading(true);
    setError('');
    setWarning(null);

    try {
      const payload = {
        project_id: parseInt(formData.project_id, 10),
        title: formData.title.trim(),
        description: formData.description ? formData.description.trim() : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null,
        estimated_hours: parseFloat(formData.estimated_hours) || 0,
        priority: formData.priority,
        status: formData.status,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        depends_on: formData.depends_on
      };

      if (isEditing) {
        await taskAPI.updateTask(initialData.id, payload);
      } else {
        await taskAPI.createTask(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      if (err.code === 'DEPENDENCY_BLOCK') {
        setWarning({
          message: err.message,
          uncompletedPredecessors: err.uncompletedPredecessors
        });
      } else {
        setError(err.message || 'Failed to save task.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 md:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Edit Task' : 'Create New Task'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Modify task specifications and dependencies' : 'Define new task deliverable and schedule'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Banner (Predecessor Incomplete) */}
        {warning && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Dependency Precondition Warning</span>
            </div>
            <p className="text-slate-300">{warning.message}</p>
            {warning.uncompletedPredecessors?.length > 0 && (
              <div className="mt-2 space-y-1 rounded-lg bg-slate-950/60 p-2.5 border border-amber-500/20">
                <span className="text-[11px] font-semibold text-amber-300">Incomplete Predecessor Tasks:</span>
                <ul className="list-disc list-inside text-[11px] text-slate-400">
                  {warning.uncompletedPredecessors.map((p) => (
                    <li key={p.id}>
                      <strong>{p.title}</strong> — Current Status:{' '}
                      <span className="text-amber-400">{p.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Project Selection (if multiple projects available and not fixed) */}
          {!defaultProjectId && projects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Project <span className="text-rose-400">*</span>
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Implement JWT Role Guard Middleware"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Task Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Specify technical acceptance criteria, architecture constraints..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Row 1: Assignee & Estimated Hours */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assignee
              </label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m) => {
                  const u = m.user || m;
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({m.project_role || u.role})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estimated Effort (Hours)
              </label>
              <input
                type="number"
                name="estimated_hours"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Priority & Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Priority Level
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Due Date (Deadline)
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Multi-Select: Predecessors ("Depends On") */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Task Dependencies (Must complete before this task starts)
            </label>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 max-h-40 overflow-y-auto space-y-1.5">
              {availableProjectTasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">
                  No other tasks in this project to depend on.
                </p>
              ) : (
                availableProjectTasks.map((t) => {
                  const isChecked = formData.depends_on.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition border text-xs ${
                        isChecked
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                          : 'border-transparent text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDependency(t.id)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate font-medium">{t.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          t.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Select tasks that must be marked "Completed" before this task can transition into "In Progress".
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition"
            >
              <Check className="h-4 w-4" />
              <span>{loading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
