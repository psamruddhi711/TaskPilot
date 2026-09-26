import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckSquare,
  AlertCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  GitCommit,
  Check,
  Sparkles,
  ShieldAlert,
  Award,
  Plus,
  Trash2
} from 'lucide-react';
import { taskAPI, projectAPI, workloadAPI, skillAPI } from '../services/api';
import { OverloadConfirmModal } from './OverloadConfirmModal';

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

  // Required Skills State
  const [availableSkills, setAvailableSkills] = useState([]);
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState(3);
  const [newSkillMandatory, setNewSkillMandatory] = useState(false);

  const [availableProjectTasks, setAvailableProjectTasks] = useState([]);
  const [workloadSuggestions, setWorkloadSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(null);

  // Overload Modal State
  const [isOverloadModalOpen, setIsOverloadModalOpen] = useState(false);
  const [overloadPayload, setOverloadPayload] = useState(null);

  // Fetch available global skills
  useEffect(() => {
    skillAPI
      .getSkills()
      .then((res) => setAvailableSkills(res || []))
      .catch((err) => console.warn('Could not fetch skills:', err.message));
  }, []);

  // Fetch candidate tasks for "depends on" multi-select and workload suggestions
  useEffect(() => {
    const selectedProjId = formData.project_id || defaultProjectId;
    if (selectedProjId) {
      projectAPI
        .getProjectTasks(selectedProjId)
        .then((res) => {
          if (res.success) {
            const candidates = isEditing
              ? res.data.filter((t) => t.id !== initialData.id)
              : res.data;
            setAvailableProjectTasks(candidates);
          }
        })
        .catch((err) => console.warn('Could not fetch candidate tasks:', err.message));

      workloadAPI
        .getSuggestions(selectedProjId, isEditing ? initialData.id : null)
        .then((res) => {
          if (res.success) {
            setWorkloadSuggestions(res.data.suggestions || []);
          }
        })
        .catch((err) => console.warn('Could not fetch workload suggestions:', err.message));
    }
  }, [formData.project_id, defaultProjectId, isEditing, initialData]);

  // Load initial data and existing required skills
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

      // Fetch task's existing required skills
      taskAPI
        .getRequiredSkills(initialData.id)
        .then((res) => {
          const formatted = (res || []).map((rs) => ({
            skill_id: rs.skill_id,
            name: rs.skill?.name || `Skill #${rs.skill_id}`,
            minimum_proficiency: rs.minimum_proficiency,
            is_mandatory: rs.is_mandatory
          }));
          setRequiredSkills(formatted);
        })
        .catch(() => setRequiredSkills([]));
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
      setRequiredSkills([]);
    }
    setError('');
    setWarning(null);
    setIsOverloadModalOpen(false);
    setOverloadPayload(null);
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

  const handleAddRequiredSkill = () => {
    if (!selectedSkillToAdd) return;
    const skillObj = availableSkills.find((s) => s.id === parseInt(selectedSkillToAdd, 10));
    if (!skillObj) return;

    if (requiredSkills.some((r) => r.skill_id === skillObj.id)) {
      return; // Already added
    }

    setRequiredSkills((prev) => [
      ...prev,
      {
        skill_id: skillObj.id,
        name: skillObj.name,
        minimum_proficiency: parseInt(newSkillProficiency, 10),
        is_mandatory: newSkillMandatory
      }
    ]);

    setSelectedSkillToAdd('');
    setNewSkillProficiency(3);
    setNewSkillMandatory(false);
  };

  const handleRemoveRequiredSkill = (skillId) => {
    setRequiredSkills((prev) => prev.filter((r) => r.skill_id !== skillId));
  };

  const executeSave = async (confirmedOverride = false) => {
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

      let taskId = initialData?.id;

      if (isEditing) {
        await taskAPI.updateTask(initialData.id, payload);
        if (payload.assigned_to) {
          await taskAPI.assignTask(initialData.id, payload.assigned_to, confirmedOverride);
        }
      } else {
        const createdRes = await taskAPI.createTask(payload);
        taskId = createdRes.data?.id;
        if (payload.assigned_to && taskId) {
          await taskAPI.assignTask(taskId, payload.assigned_to, confirmedOverride);
        }
      }

      // Sync required skills
      if (taskId) {
        await taskAPI.setRequiredSkills(taskId, requiredSkills);
      }

      onSuccess();
      onClose();
    } catch (err) {
      if (err.code === 'DEPENDENCY_BLOCK') {
        setWarning({
          message: err.message,
          uncompletedPredecessors: err.uncompletedPredecessors
        });
      } else if (err.code === 'OVERLOAD_WARNING' || err.status === 409) {
        setOverloadPayload(err.data || {
          user_name: 'Selected Member',
          weekly_capacity_hours: 40,
          current_assigned_hours: 0,
          task_estimated_hours: formData.estimated_hours,
          projected_hours: formData.estimated_hours,
          excess_hours: formData.estimated_hours,
          projected_utilization: 100
        });
        setIsOverloadModalOpen(true);
      } else {
        setError(err.message || 'Failed to save task.');
      }
    } finally {
      setLoading(false);
    }
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
    executeSave(false);
  };

  const handleConfirmOverload = () => {
    setIsOverloadModalOpen(false);
    executeSave(true);
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
                {isEditing ? 'Modify specifications, required skills & dependencies' : 'Define new task deliverable, required skill matrix & schedule'}
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

        {/* Warning Banner */}
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
                      <strong>{p.title}</strong> — Status: <span className="text-amber-400">{p.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Project Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project <span className="text-rose-400">*</span>
            </label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              disabled={isEditing}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="">-- Choose Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

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
              placeholder="e.g. Implement OAuth token refresh flow"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Task Description & Technical Notes
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Scope details, acceptance criteria, APIs involved..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Section: Required Skills (Stage 8) */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-400" />
                <span>Required Skills & Technical Proficiencies</span>
              </span>
              <span className="text-[10px] text-slate-400">Used by recommendation engine</span>
            </div>

            {/* List of currently required skills */}
            {requiredSkills.length > 0 && (
              <div className="space-y-1.5">
                {requiredSkills.map((rs) => (
                  <div
                    key={rs.skill_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{rs.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                        Min Level: {rs.minimum_proficiency}/5
                      </span>
                      {rs.is_mandatory && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          Mandatory
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRequiredSkill(rs.skill_id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add skill input row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
              <select
                value={selectedSkillToAdd}
                onChange={(e) => setSelectedSkillToAdd(e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="">+ Add Required Skill</option>
                {availableSkills
                  .filter((s) => !requiredSkills.some((r) => r.skill_id === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>

              <select
                value={newSkillProficiency}
                onChange={(e) => setNewSkillProficiency(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value={1}>Lvl 1 (Beginner)</option>
                <option value={2}>Lvl 2 (Novice)</option>
                <option value={3}>Lvl 3 (Intermediate)</option>
                <option value={4}>Lvl 4 (Advanced)</option>
                <option value={5}>Lvl 5 (Expert)</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={newSkillMandatory}
                  onChange={(e) => setNewSkillMandatory(e.target.checked)}
                  className="accent-indigo-500"
                />
                <span>Mandatory</span>
              </label>

              <button
                type="button"
                onClick={handleAddRequiredSkill}
                disabled={!selectedSkillToAdd}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white disabled:opacity-50 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Grid: Assignee & Estimated Hours */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Assignee
                </label>
                {workloadSuggestions.length > 0 && (
                  <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-medium">
                    <Sparkles className="h-3 w-3" /> Balancer active
                  </span>
                )}
              </div>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="">-- Unassigned --</option>
                {workloadSuggestions.length > 0
                  ? workloadSuggestions.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.name} ({s.available_capacity}h free{s.is_overloaded ? ' - OVERLOAD' : ''})
                      </option>
                    ))
                  : projectMembers.map((m) => (
                      <option key={m.user_id || m.id} value={m.user_id || m.id}>
                        {m.name || m.user?.name}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Baseline Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Grid: Priority & Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
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
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Start Date & Due Date */}
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Dependencies Multi-Select */}
          {availableProjectTasks.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Depends On Predecessors (Must be Completed first)
              </label>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1">
                {availableProjectTasks.map((cand) => {
                  const isChecked = formData.depends_on.includes(cand.id);
                  return (
                    <div
                      key={cand.id}
                      onClick={() => handleToggleDependency(cand.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                        isChecked
                          ? 'bg-indigo-950/40 border border-indigo-500/30 text-white'
                          : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                            isChecked
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="truncate">{cand.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{cand.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Capacity Overload Warning Modal */}
      <OverloadConfirmModal
        isOpen={isOverloadModalOpen}
        onClose={() => setIsOverloadModalOpen(false)}
        onConfirm={handleConfirmOverload}
        overloadData={overloadPayload}
      />
    </div>
  );
};

export default TaskModal;
