import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  AlertCircle,
  AlertTriangle,
  Award,
  Trash2,
  Check
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#30343A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/30">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">
                {isEditing ? 'Edit Task' : 'Create Task'}
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                {isEditing ? 'Modify specifications, required skills & dependencies' : 'Define new task deliverable, required skill matrix & schedule'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-[#F3F4F6] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="mt-4 rounded-md border border-amber-300 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Dependency Precondition Warning</span>
            </div>
            <p className="text-[#6B7280] dark:text-[#A1A1AA]">{warning.message}</p>
            {warning.uncompletedPredecessors?.length > 0 && (
              <div className="mt-1.5 space-y-1 rounded bg-white dark:bg-[#181A1D] p-2.5 border border-amber-200 dark:border-amber-500/20">
                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Incomplete Predecessor Tasks:</span>
                <ul className="list-disc list-inside text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                  {warning.uncompletedPredecessors.map((p) => (
                    <li key={p.id}>
                      <strong>{p.title}</strong> — Status: <span className="text-amber-700 dark:text-amber-400">{p.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
              Project <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              disabled={isEditing}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500 disabled:opacity-60"
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
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
              Task Title <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Implement OAuth token refresh flow"
              required
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
              Task Description & Technical Notes
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Scope details, acceptance criteria, APIs involved..."
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Section: Required Skills */}
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D]/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>Required Skills</span>
              </span>
              <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Used by recommender</span>
            </div>

            {/* List of currently required skills */}
            {requiredSkills.length > 0 && (
              <div className="space-y-1">
                {requiredSkills.map((rs) => (
                  <div
                    key={rs.skill_id}
                    className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-[#25292E] border border-[#E5E7EB] dark:border-[#30343A] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{rs.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/30">
                        Lvl {rs.minimum_proficiency}/5
                      </span>
                      {rs.is_mandatory && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 font-medium">
                          Mandatory
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRequiredSkill(rs.skill_id)}
                      className="text-[#9CA3AF] dark:text-[#71717A] hover:text-red-600 dark:hover:text-red-400 p-0.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add skill input row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5E7EB] dark:border-[#30343A]">
              <select
                value={selectedSkillToAdd}
                onChange={(e) => setSelectedSkillToAdd(e.target.value)}
                className="flex-1 min-w-[130px] rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
              >
                <option value="">+ Add Skill</option>
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
                className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
              >
                <option value={1}>Lvl 1 (Beginner)</option>
                <option value={2}>Lvl 2 (Novice)</option>
                <option value={3}>Lvl 3 (Intermediate)</option>
                <option value={4}>Lvl 4 (Advanced)</option>
                <option value={5}>Lvl 5 (Expert)</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#A1A1AA] cursor-pointer bg-white dark:bg-[#181A1D] px-2 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A]">
                <input
                  type="checkbox"
                  checked={newSkillMandatory}
                  onChange={(e) => setNewSkillMandatory(e.target.checked)}
                  className="accent-[#4F46E5]"
                />
                <span>Mandatory</span>
              </label>

              <button
                type="button"
                onClick={handleAddRequiredSkill}
                disabled={!selectedSkillToAdd}
                className="px-3 py-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-medium text-white disabled:opacity-50 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Grid: Assignee & Estimated Hours */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Assignee
              </label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
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
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Grid: Priority & Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Dependencies Multi-Select */}
          {availableProjectTasks.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6]">
                Depends On Predecessors
              </label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5]/60 dark:bg-[#181A1D] p-2 space-y-1">
                {availableProjectTasks.map((cand) => {
                  const isChecked = formData.depends_on.includes(cand.id);
                  return (
                    <div
                      key={cand.id}
                      onClick={() => handleToggleDependency(cand.id)}
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition text-xs ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6]'
                          : 'hover:bg-white dark:hover:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition ${
                            isChecked
                              ? 'border-[#4F46E5] dark:border-[#818CF8] bg-[#4F46E5] text-white'
                              : 'border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#181A1D]'
                          }`}
                        >
                          {isChecked && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span className="truncate">{cand.title}</span>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] shrink-0">{cand.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB] dark:border-[#30343A]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-4 py-2 text-xs font-medium text-white shadow-sm disabled:opacity-50 transition"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{loading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}</span>
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
