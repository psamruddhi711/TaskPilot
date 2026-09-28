import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI, userAPI } from '../services/api';
import { TaskModal } from '../components/TaskModal';
import {
  CheckSquare,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  GitCommit,
  AlertCircle,
  Trash2,
  Edit2
} from 'lucide-react';

const PRIORITY_BADGES = {
  Low: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  Medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  High: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  Critical: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50'
};

const STATUS_BADGES = {
  'To Do': 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  'In Progress': 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  Blocked: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
  'In Review': 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  Completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-[#202124] dark:text-[#F3F4F6]">Tasks Management</h1>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueCount} Overdue
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Track deliverable execution, dependencies, priorities, and schedules
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-2 text-xs font-medium text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Blocking Warning Modal */}
      {blockingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-lg border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-[#1C1F23] shadow-xl p-6">
            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Dependency Prerequisite Not Met</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300">Cannot advance task to "In Progress"</p>
              </div>
            </div>

            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
              {blockingWarning.message}
            </p>

            {blockingWarning.uncompletedPredecessors?.length > 0 && (
              <div className="mt-3 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-3 space-y-2">
                <p className="text-[11px] font-semibold text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">
                  Incomplete Predecessors:
                </p>
                <div className="space-y-1.5">
                  {blockingWarning.uncompletedPredecessors.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs p-2 rounded bg-white dark:bg-[#25292E] border border-[#E5E7EB] dark:border-[#30343A]"
                    >
                      <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{p.title}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setBlockingWarning(null)}
                className="rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-2 text-xs font-medium text-white transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-3.5 shadow-sm">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500"
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
            <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500"
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
            <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] mb-1">Assignee</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500"
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
            <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] mb-1">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500"
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
        <form onSubmit={handleSearchSubmit} className="relative mt-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title, criteria, keywords..."
            className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] py-1.5 pl-8 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Task Cards List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-12 text-center shadow-sm">
          <CheckSquare className="mx-auto h-8 w-8 text-[#9CA3AF] dark:text-[#71717A] mb-2" />
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">No Tasks Match Criteria</h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm">
            Adjust your search or filter options, or create a new task to get started.
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-2 text-xs font-medium text-white transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
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
                className={`group relative flex flex-col justify-between gap-3 rounded-md border bg-white dark:bg-[#1C1F23] p-3.5 transition-all hover:border-[#D1D5DB] dark:hover:border-[#4B5563] cursor-pointer lg:flex-row lg:items-center shadow-xs ${
                  isOverdue
                    ? 'border-l-4 border-l-red-500 border-[#E5E7EB] dark:border-[#30343A]'
                    : 'border-[#E5E7EB] dark:border-[#30343A]'
                }`}
              >
                {/* Left Section: Title, Project, Tags, Overdue */}
                <div className="space-y-1 max-w-2xl overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Project Chip */}
                    {task.project && (
                      <span className="rounded bg-[#F1F3F5] dark:bg-[#181A1D] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                        {task.project.name}
                      </span>
                    )}

                    {/* Priority Badge */}
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                        PRIORITY_BADGES[task.priority] || PRIORITY_BADGES['Medium']
                      }`}
                    >
                      {task.priority}
                    </span>

                    {/* Overdue Badge */}
                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" />
                        OVERDUE ({task.due_date})
                      </span>
                    )}

                    {/* Dependency Indicator */}
                    {predCount > 0 && (
                      <span
                        className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                          hasIncompletePredecessors
                            ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                            : 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        }`}
                        title={
                          hasIncompletePredecessors
                            ? 'Has incomplete predecessor tasks'
                            : 'All dependencies completed'
                        }
                      >
                        <GitCommit className="h-3 w-3" />
                        {predCount} {predCount === 1 ? 'dep' : 'deps'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors truncate">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] line-clamp-1 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Right Section: Assignee, Hours, Status Quick-Select, Actions */}
                <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
                  {/* Assignee */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F1F3F5] dark:bg-[#25292E] text-[10px] font-semibold text-[#4F46E5] dark:text-[#818CF8] border border-[#E5E7EB] dark:border-[#30343A]">
                      {task.assignee?.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs text-[#202124] dark:text-[#F3F4F6]">
                      {task.assignee?.name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Estimated Hours */}
                  <div className="flex items-center gap-1 rounded bg-[#F1F3F5] dark:bg-[#181A1D] px-2 py-0.5 text-[11px] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                    <Clock className="h-3 w-3 text-[#9CA3AF] dark:text-[#71717A]" />
                    <span>{task.estimated_hours || 0}h</span>
                  </div>

                  {/* Quick Status Dropdown */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e, task.id, e.target.value)}
                      className={`rounded border px-2 py-1 text-xs font-medium outline-none cursor-pointer ${
                        STATUS_BADGES[task.status] || STATUS_BADGES['To Do']
                      } bg-white dark:bg-[#181A1D]`}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Blocked">Blocked</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEdit(e, task)}
                      title="Edit Task"
                      className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-[#F3F4F6] transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, task.id)}
                      title="Delete Task"
                      className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition"
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
