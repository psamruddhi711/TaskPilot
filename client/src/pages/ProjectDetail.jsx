import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectAPI, userAPI, taskAPI } from '../services/api';
import { ProjectModal } from '../components/ProjectModal';
import { AddMemberModal } from '../components/AddMemberModal';
import { TaskModal } from '../components/TaskModal';
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  Users,
  UserPlus,
  Shield,
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
  UserMinus,
  Sparkles,
  CheckSquare,
  Plus,
  AlertTriangle,
  GitCommit
} from 'lucide-react';

const STATUS_CONFIG = {
  Planning: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30'
  },
  'In Progress': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30'
  },
  Completed: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  'On Hold': {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30'
  }
};

const TASK_STATUS_BADGES = {
  'To Do': 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  'In Progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  Blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'In Review': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

const PRIORITY_BADGES = {
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Critical: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
};

export const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'members'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError('');
      const [projRes, tasksRes] = await Promise.all([
        projectAPI.getProject(id),
        projectAPI.getProjectTasks(id)
      ]);

      if (projRes.success) setProject(projRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await userAPI.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.warn('Failed to fetch user roster:', err.message);
    }
  };

  useEffect(() => {
    fetchProjectData();
    fetchAllUsers();
  }, [id]);

  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${project.name}"?`)) {
      return;
    }

    try {
      await projectAPI.deleteProject(id);
      navigate('/projects');
    } catch (err) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) {
      return;
    }

    try {
      await projectAPI.removeProjectMember(id, memberUserId);
      fetchProjectData();
    } catch (err) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-36 rounded bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-400 mb-3" />
        <h3 className="text-base font-bold text-white">Project Not Found</h3>
        <p className="mt-1 text-xs text-rose-300">{error || 'This project does not exist.'}</p>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG['Planning'];
  const existingMemberUserIds = (project.members || []).map((m) => m.user_id);
  const overdueTasksCount = tasks.filter((t) => t.isOverdue).length;

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={handleDeleteProject}
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Overview Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                {project.status}
              </span>
              <span className="text-xs text-slate-500">
                Created on {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {project.name}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {project.description || 'No detailed scope or description provided yet.'}
            </p>
          </div>

          {/* Quick Metrics Column */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row lg:flex-col lg:w-64 shrink-0">
            {/* Manager Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Project Manager</p>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-xs text-white">
                  {project.manager?.name?.charAt(0) || 'M'}
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-bold text-white">
                    {project.manager?.name || 'Unassigned'}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">{project.manager?.email}</p>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Timeline Schedule</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Start:</span>
                  <span>{project.start_date || 'Immediate'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="font-semibold text-indigo-400">{project.deadline || 'Open'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'tasks'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Tasks Roster</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.2 text-xs font-semibold text-slate-300 border border-slate-700">
            {tasks.length}
          </span>
          {overdueTasksCount > 0 && (
            <span className="rounded-full bg-rose-500/20 text-rose-400 px-1.5 py-0.2 text-[10px] font-bold border border-rose-500/30">
              {overdueTasksCount} overdue
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'members'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team Members</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.2 text-xs font-semibold text-slate-300 border border-slate-700">
            {project.members?.length || 0}
          </span>
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Deliverables and dependency graph for this project workspace
            </p>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
              <CheckSquare className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-white">No Tasks Created Yet</h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Break this project down into milestone deliverables, assign team members, and configure dependencies.
              </p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Task</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => {
                const isOverdue = task.isOverdue;
                const predCount = task.predecessors?.length || 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer transition ${
                      isOverdue
                        ? 'border-l-4 border-l-rose-500 border-slate-800 bg-rose-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            PRIORITY_BADGES[task.priority] || PRIORITY_BADGES['Medium']
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                            TASK_STATUS_BADGES[task.status] || TASK_STATUS_BADGES['To Do']
                          }`}
                        >
                          {task.status}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                            <AlertTriangle className="h-3 w-3" /> Overdue ({task.due_date})
                          </span>
                        )}
                        {predCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <GitCommit className="h-3 w-3 text-indigo-400" />
                            {predCount} {predCount === 1 ? 'dependency' : 'dependencies'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{task.title}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                      <span>{task.assignee?.name || 'Unassigned'}</span>
                      <span className="font-semibold text-slate-300">{task.estimated_hours || 0}h</span>
                      <span className="text-indigo-400">View &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Allocated team members and their designated project roles
            </p>

            {canManage && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {/* Members Cards List */}
          {!project.members || project.members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-white">No Members Assigned</h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Add engineers, designers, and managers to this project workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.members.map((member) => {
                const u = member.user || {};
                const isManager = u.id === project.manager_id;

                return (
                  <div
                    key={member.user_id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/90"
                  >
                    <div>
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-sm font-bold text-white shadow-md">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="overflow-hidden">
                            <p className="truncate text-sm font-bold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isManager && (
                                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" title="Project Manager" />
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>

                        {canManage && !isManager && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id, u.name)}
                            title="Remove from project"
                            className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Roles Badges */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                          {member.project_role || 'Member'}
                        </span>
                        <span className="rounded-lg bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-700/60">
                          {u.role}
                        </span>
                      </div>
                    </div>

                    {/* Capacity */}
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        Weekly Bandwidth
                      </span>
                      <strong className="text-white font-semibold">
                        {u.weekly_capacity_hours || 40} hrs/wk
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchProjectData}
        initialData={project}
        users={users}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={fetchProjectData}
        projectId={id}
        existingMemberUserIds={existingMemberUserIds}
        availableUsers={users}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={fetchProjectData}
        defaultProjectId={id}
        projectMembers={project.members || []}
      />
    </div>
  );
};
