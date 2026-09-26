import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI, userAPI } from '../services/api';
import { TaskModal } from '../components/TaskModal';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Layers,
  ArrowRight,
  GitCommit,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';

const PRIORITY_BADGES = {
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse'
};

const STATUS_BADGES = {
  'To Do': 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  'In Progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  Blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'In Review': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

export const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Warning States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [blockingWarning, setBlockingWarning] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (priorityFilter !== 'All') params.priority = priorityFilter;
      if (assigneeFilter !== 'All') params.assigned_to = assigneeFilter;
      if (projectFilter !== 'All') params.project_id = projectFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await taskAPI.getTasks(params);
      if (res.success) {
        setTasks(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        projectAPI.getProjects(),
        userAPI.getUsers()
      ]);
      if (projRes.success) setProjects(projRes.data);
      if (userRes.success) setUsers(userRes.data);
    } catch (err) {
      console.warn('Metadata fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, assigneeFilter, projectFilter]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleStatusChange = async (e, taskId, newStatus) => {
    e.stopPropagation();
    try {
      setBlockingWarning(null);
      await taskAPI.updateTaskStatus(taskId, newStatus);
      fetchTasks();
    } catch (err) {
      if (err.code === 'DEPENDENCY_BLOCK') {
        setBlockingWarning({
          taskId,
          message: err.message,
          uncompletedPredecessors: err.uncompletedPredecessors || []
        });
      } else {
        alert(err.message || 'Failed to update status');
      }
    }
  };

  const handleDelete = async (e, taskId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await taskAPI.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleEdit = (e, task) => {
    e.stopPropagation();
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">Tasks Management</h2>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueCount} Overdue
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Track deliverable execution, dependencies, priorities, and schedules
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.98] transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Blocking Warning Modal */}
      {blockingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl p-6">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Dependency Prerequisite Not Met</h3>
                <p className="text-xs text-amber-300">Cannot advance task to "In Progress"</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {blockingWarning.message}
            </p>

            {blockingWarning.uncompletedPredecessors?.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Incomplete Predecessor Deliverables:
                </p>
                <div className="space-y-1.5">
                  {blockingWarning.uncompletedPredecessors.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <span className="font-semibold text-slate-200">{p.title}</span>
                      <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setBlockingWarning(null)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-500"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Assignee</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-500"
            >
              <option value="All">All Assignees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-500"
            >
              <option value="All">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search row */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title, criteria, keywords..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Task Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-16 text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No Tasks Match Criteria</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Adjust your search or filter options, or create a new task to get started.
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isOverdue = task.isOverdue;
            const predCount = task.predecessors?.length || 0;
            const hasIncompletePredecessors = (task.predecessors || []).some(
              (p) => p.status !== 'Completed'
            );

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className={`group relative flex flex-col justify-between gap-4 rounded-2xl border bg-slate-900/60 p-5 transition-all hover:bg-slate-900/90 hover:shadow-lg cursor-pointer backdrop-blur-sm lg:flex-row lg:items-center ${
                  isOverdue
                    ? 'border-l-4 border-l-rose-500 border-t-slate-800 border-r-slate-800 border-b-slate-800 bg-rose-950/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Left Section: Title, Project, Tags, Overdue */}
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Project Chip */}
                    {task.project && (
                      <span className="rounded-md bg-slate-950 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-800">
                        {task.project.name}
                      </span>
                    )}

                    {/* Priority Badge */}
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        PRIORITY_BADGES[task.priority] || PRIORITY_BADGES['Medium']
                      }`}
                    >
                      {task.priority}
                    </span>

                    {/* Overdue Badge */}
                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                        <AlertTriangle className="h-3 w-3" />
                        OVERDUE (Due {task.due_date})
                      </span>
                    )}

                    {/* Dependency Indicator */}
                    {predCount > 0 && (
                      <span
                        className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                          hasIncompletePredecessors
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        }`}
                        title={
                          hasIncompletePredecessors
                            ? 'Has incomplete predecessor tasks'
                            : 'All dependencies completed'
                        }
                      >
                        <GitCommit className="h-3 w-3" />
                        {predCount} {predCount === 1 ? 'dependency' : 'dependencies'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Right Section: Assignee, Hours, Status Quick-Select, Actions */}
                <div className="flex flex-wrap items-center gap-4 lg:shrink-0">
                  {/* Assignee */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-xs font-bold text-indigo-300">
                      {task.assignee?.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs text-slate-300 font-medium">
                      {task.assignee?.name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Estimated Hours */}
                  <div className="flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1 text-xs text-slate-400 border border-slate-800">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{task.estimated_hours || 0} hrs</span>
                  </div>

                  {/* Quick Status Dropdown */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e, task.id, e.target.value)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer ${
                        STATUS_BADGES[task.status] || STATUS_BADGES['To Do']
                      } bg-slate-950`}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Blocked">Blocked</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleEdit(e, task)}
                      title="Edit Task"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, task.id)}
                      title="Delete Task"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTasks}
        initialData={editingTask}
        projects={projects}
        projectMembers={users}
      />
    </div>
  );
};
