import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI } from '../services/api';
import { TaskModal } from '../components/TaskModal';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  AlertCircle,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Shield,
  Edit2,
  Trash2,
  Plus,
  X,
  Layers,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

const PRIORITY_CONFIG = {
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Critical: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
};

const STATUS_CONFIG = {
  'To Do': 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  'In Progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  Blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'In Review': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

export const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'dependencies'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddDepOpen, setIsAddDepOpen] = useState(false);
  const [selectedDepId, setSelectedDepId] = useState('');
  const [depLoading, setDepLoading] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await taskAPI.getTask(id);
      if (res.success) {
        setTask(res.data);
        // Also fetch candidate tasks in the same project for adding dependencies
        if (res.data.project_id) {
          const projTasksRes = await projectAPI.getProjectTasks(res.data.project_id);
          if (projTasksRes.success) {
            setProjectTasks(projTasksRes.data.filter((t) => t.id !== parseInt(id, 10)));
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setWarning(null);
      await taskAPI.updateTaskStatus(id, newStatus);
      fetchTaskDetails();
    } catch (err) {
      if (err.code === 'DEPENDENCY_BLOCK') {
        setWarning({
          message: err.message,
          uncompletedPredecessors: err.uncompletedPredecessors || []
        });
      } else {
        alert(err.message || 'Failed to update status.');
      }
    }
  };

  const handleAddDependency = async (e) => {
    e.preventDefault();
    if (!selectedDepId) return;

    setDepLoading(true);
    try {
      await taskAPI.addDependency(id, parseInt(selectedDepId, 10));
      setIsAddDepOpen(false);
      setSelectedDepId('');
      fetchTaskDetails();
    } catch (err) {
      alert(err.message || 'Failed to add dependency');
    } finally {
      setDepLoading(false);
    }
  };

  const handleRemoveDependency = async (depTaskId) => {
    if (!window.confirm('Remove this task dependency?')) return;
    try {
      await taskAPI.removeDependency(id, depTaskId);
      fetchTaskDetails();
    } catch (err) {
      alert(err.message || 'Failed to remove dependency');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Permanently delete task "${task.title}"?`)) return;
    try {
      await taskAPI.deleteTask(id);
      navigate('/tasks');
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-slate-800" />
        <div className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-400 mb-3" />
        <h3 className="text-base font-bold text-white">Task Not Found</h3>
        <p className="mt-1 text-xs text-rose-300">{error || 'This task does not exist.'}</p>
        <Link
          to="/tasks"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Task Roster</span>
        </Link>
      </div>
    );
  }

  const isOverdue = task.isOverdue;
  const predecessors = task.predecessors || [];
  const dependents = task.dependents || [];
  const incompletePredecessors = predecessors.filter((p) => p.status !== 'Completed');
  const allPredecessorsCompleted = predecessors.length > 0 && incompletePredecessors.length === 0;

  // Eligible tasks to add as dependency
  const existingPredecessorIds = predecessors.map((p) => p.id);
  const eligibleDepCandidates = projectTasks.filter(
    (t) => !existingPredecessorIds.includes(t.id)
  );

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/tasks" className="hover:text-white transition flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </Link>
          <span>/</span>
          {task.project && (
            <Link
              to={`/projects/${task.project.id}`}
              className="text-indigo-400 hover:text-indigo-300 transition font-medium"
            >
              {task.project.name}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Edit Task</span>
          </button>
          <button
            onClick={handleDeleteTask}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Warning Banner (Predecessor Incomplete) */}
      {warning && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-200 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2.5 font-bold text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Cannot Start Task: Unmet Dependencies</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{warning.message}</p>
          {warning.uncompletedPredecessors?.length > 0 && (
            <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-500/20 space-y-2">
              <span className="text-[11px] font-semibold text-amber-300">
                You must complete the following prerequisite tasks first:
              </span>
              <div className="space-y-1.5">
                {warning.uncompletedPredecessors.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/tasks/${p.id}`)}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition"
                  >
                    <span className="font-semibold text-white">{p.title}</span>
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Project Badge */}
              {task.project && (
                <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-slate-800">
                  {task.project.name}
                </span>
              )}

              {/* Priority */}
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
                  PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['Medium']
                }`}
              >
                {task.priority} Priority
              </span>

              {/* Status */}
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  STATUS_CONFIG[task.status] || STATUS_CONFIG['To Do']
                }`}
              >
                {task.status}
              </span>

              {/* Overdue */}
              {isOverdue && (
                <span className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  OVERDUE (Due {task.due_date})
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {task.title}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No additional technical notes or descriptions specified.'}
            </p>
          </div>

          {/* Quick Status Changers */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 shrink-0 lg:w-64 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Transition Status
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`rounded-lg py-1.5 px-3 text-xs font-semibold text-left transition border ${
                    task.status === st
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {st} {task.status === st && '✓'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Details
        </button>
        <button
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'dependencies'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCommit className="h-4 w-4" />
          <span>Dependencies</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.2 text-xs font-semibold text-slate-300 border border-slate-700">
            {predecessors.length + dependents.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Assignee Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 mb-3">Assigned Team Member</p>
            {task.assignee ? (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md">
                  {task.assignee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{task.assignee.name}</p>
                  <p className="text-xs text-slate-400">{task.assignee.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-medium text-indigo-400 rounded bg-indigo-500/10 px-1.5 py-0.2 border border-indigo-500/20">
                    {task.assignee.role} &bull; {task.assignee.weekly_capacity_hours}h cap
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No team member assigned yet.</p>
            )}
          </div>

          {/* Timeline & Estimates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
            <p className="text-xs font-semibold text-slate-400">Timeline & Scope</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Estimated Effort:</span>
                <strong className="text-white font-bold">{task.estimated_hours || 0} hours</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Start Date:</span>
                <span>{task.start_date || 'Immediate'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Due Date:</span>
                <span className={isOverdue ? 'font-bold text-rose-400' : 'text-slate-200'}>
                  {task.due_date || 'Open'}
                </span>
              </div>
            </div>
          </div>

          {/* Creator & History */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
            <p className="text-xs font-semibold text-slate-400">Metadata & Provenance</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Created By:</span>
                <span className="text-slate-200">{task.creator?.name || 'Admin'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Created At:</span>
                <span>{new Date(task.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Last Modified:</span>
                <span>{new Date(task.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dependencies */}
      {activeTab === 'dependencies' && (
        <div className="space-y-8">
          {/* Predecessors Section */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Predecessors (Must Complete First)</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {predecessors.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  This task cannot advance to "In Progress" until all predecessor tasks are marked Completed.
                </p>
              </div>

              <button
                onClick={() => setIsAddDepOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Predecessor</span>
              </button>
            </div>

            {/* Dependency Status Card */}
            {predecessors.length > 0 && (
              <div
                className={`rounded-xl border p-3 text-xs flex items-center justify-between ${
                  allPredecessorsCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {allPredecessorsCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span>
                    {allPredecessorsCompleted
                      ? 'All prerequisites satisfied — Task is ready to start.'
                      : `${incompletePredecessors.length} prerequisite task(s) currently blocking execution.`}
                  </span>
                </div>
              </div>
            )}

            {/* Predecessors List */}
            {predecessors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
                No predecessor dependencies configured for this task. It can be started at any time.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {predecessors.map((p) => {
                  const isDone = p.status === 'Completed';
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/tasks/${p.id}`)}
                      className={`flex items-center justify-between p-4 rounded-xl border bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer transition ${
                        isDone
                          ? 'border-emerald-500/30'
                          : 'border-amber-500/40 bg-amber-950/10'
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                              isDone
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {p.status}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.priority}</span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDependency(p.id);
                        }}
                        title="Remove dependency"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dependents Section */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Dependents (Waiting On This Task)</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {dependents.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Downstream deliverables that require this task to be Completed before they can enter "In Progress".
              </p>
            </div>

            {dependents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
                No downstream tasks depend on this deliverable.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {dependents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/tasks/${d.id}`)}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer transition"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {d.status}
                      </span>
                      <p className="text-xs font-bold text-white truncate">{d.title}</p>
                    </div>
                    <span className="text-xs text-indigo-400">View &rarr;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Dependency Modal */}
      {isAddDepOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Predecessor Dependency</h3>
              <button
                onClick={() => setIsAddDepOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddDependency} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Prerequisite Task
                </label>
                <select
                  value={selectedDepId}
                  onChange={(e) => setSelectedDepId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Task in Project --</option>
                  {eligibleDepCandidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDepOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depLoading || !selectedDepId}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                >
                  {depLoading ? 'Adding...' : 'Attach Dependency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal for Editing */}
      <TaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchTaskDetails}
        initialData={task}
        defaultProjectId={task.project_id}
      />
    </div>
  );
};
