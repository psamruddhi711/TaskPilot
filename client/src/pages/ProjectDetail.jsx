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
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  BadgeCheck,
  UserMinus,
  CheckSquare,
  Plus,
  AlertTriangle,
  GitCommit,
  ArrowRight
} from 'lucide-react';

const STATUS_CONFIG = {
  Planning: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/50'
  },
  'In Progress': {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/50'
  },
  Completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/50'
  },
  'On Hold': {
    bg: 'bg-[#F1F3F5] dark:bg-[#25292E]',
    text: 'text-[#6B7280] dark:text-[#A1A1AA]',
    border: 'border-[#E5E7EB] dark:border-[#30343A]'
  }
};

const TASK_STATUS_BADGES = {
  'To Do': 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  'In Progress': 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  Blocked: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
  'In Review': 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  Completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
};

const PRIORITY_BADGES = {
  Low: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  Medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  High: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  Critical: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50'
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
        <div className="h-5 w-32 rounded bg-[#E5E7EB] dark:bg-[#30343A]" />
        <div className="h-44 rounded-lg bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A]" />
        <div className="h-80 rounded-lg bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-red-600 dark:text-red-400 mb-3" />
        <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Project Not Found</h3>
        <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error || 'This project does not exist.'}</p>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#4338CA] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG['Planning'];
  const existingMemberUserIds = (project.members || []).map((m) => m.user_id);
  const overdueTasksCount = tasks.filter((t) => t.isOverdue).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Projects</span>
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3 py-1.5 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition shadow-sm"
            >
              <Edit2 className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={handleDeleteProject}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Overview Panel */}
      <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                {project.status}
              </span>
              <span className="text-xs text-[#9CA3AF] dark:text-[#71717A]">
                Created on {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-[#202124] dark:text-[#F3F4F6] md:text-2xl">
              {project.name}
            </h1>

            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed max-w-2xl">
              {project.description || 'No detailed scope or description provided yet.'}
            </p>
          </div>

          {/* Quick Metrics Column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-3 lg:w-60 shrink-0">
            {/* Manager Card */}
            <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-3">
              <p className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">Project Manager</p>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-[#4F46E5] font-semibold text-xs text-white">
                  {project.manager?.name?.charAt(0) || 'M'}
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
                    {project.manager?.name || 'Unassigned'}
                  </p>
                  <p className="truncate text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">{project.manager?.email}</p>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-3">
              <p className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">Timeline Schedule</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Start:</span>
                  <span className="text-[#202124] dark:text-[#F3F4F6]">{project.start_date || 'Immediate'}</span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Deadline:</span>
                  <span className="font-semibold text-[#4F46E5] dark:text-[#818CF8]">{project.deadline || 'Open'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] dark:border-[#30343A] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'tasks'
              ? 'border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6] font-semibold'
              : 'border-transparent text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Tasks Roster</span>
          <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
            {tasks.length}
          </span>
          {overdueTasksCount > 0 && (
            <span className="rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-semibold border border-red-200 dark:border-red-800/50">
              {overdueTasksCount} overdue
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'members'
              ? 'border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6] font-semibold'
              : 'border-transparent text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team Members</span>
          <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
            {project.members?.length || 0}
          </span>
        </button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              Deliverables and dependency graph for this project workspace
            </p>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-10 text-center shadow-sm">
              <CheckSquare className="mx-auto h-8 w-8 text-[#9CA3AF] dark:text-[#71717A] mb-2" />
              <h4 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">No Tasks Created Yet</h4>
              <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm mx-auto">
                Break this project down into milestone deliverables, assign team members, and configure dependencies.
              </p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-2 text-xs font-medium text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Task</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => {
                const isOverdue = task.isOverdue;
                const predCount = task.predecessors?.length || 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md border bg-white dark:bg-[#1C1F23] hover:border-[#D1D5DB] dark:hover:border-[#4B5563] cursor-pointer transition shadow-xs ${
                      isOverdue
                        ? 'border-l-4 border-l-red-500 border-[#E5E7EB] dark:border-[#30343A]'
                        : 'border-[#E5E7EB] dark:border-[#30343A]'
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            PRIORITY_BADGES[task.priority] || PRIORITY_BADGES['Medium']
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            TASK_STATUS_BADGES[task.status] || TASK_STATUS_BADGES['To Do']
                          }`}
                        >
                          {task.status}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" /> Overdue ({task.due_date})
                          </span>
                        )}
                        {predCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">
                            <GitCommit className="h-3 w-3 text-[#4F46E5] dark:text-[#818CF8]" />
                            {predCount} {predCount === 1 ? 'dependency' : 'dependencies'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] truncate">{task.title}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#6B7280] dark:text-[#A1A1AA] shrink-0">
                      <span>{task.assignee?.name || 'Unassigned'}</span>
                      <span className="font-semibold text-[#202124] dark:text-[#F3F4F6]">{task.estimated_hours || 0}h</span>
                      <span className="text-[#4F46E5] dark:text-[#818CF8] flex items-center gap-0.5">
                        View <ArrowRight className="h-3 w-3" />
                      </span>
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
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              Allocated team members and their designated project roles
            </p>

            {canManage && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {/* Members Cards List */}
          {!project.members || project.members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-10 text-center shadow-sm">
              <Users className="mx-auto h-8 w-8 text-[#9CA3AF] dark:text-[#71717A] mb-2" />
              <h4 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">No Members Assigned</h4>
              <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm mx-auto">
                Add engineers, designers, and managers to this project workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.members.map((member) => {
                const u = member.user || {};
                const isManager = u.id === project.manager_id;

                return (
                  <div
                    key={member.user_id}
                    className="group relative flex flex-col justify-between rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 transition-all hover:border-[#D1D5DB] dark:hover:border-[#4B5563] shadow-sm"
                  >
                    <div>
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#F1F3F5] dark:bg-[#25292E] border border-[#E5E7EB] dark:border-[#30343A] text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8]">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="overflow-hidden">
                            <p className="truncate text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1">
                              <span>{u.name}</span>
                              {isManager && (
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" title="Project Manager" />
                              )}
                            </p>
                            <p className="truncate text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">{u.email}</p>
                          </div>
                        </div>

                        {canManage && !isManager && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id, u.name)}
                            title="Remove from project"
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Roles Badges */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/50">
                          {member.project_role || 'Member'}
                        </span>
                        <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                          {u.role}
                        </span>
                      </div>
                    </div>

                    {/* Capacity */}
                    <div className="mt-3 pt-2.5 border-t border-[#E5E7EB] dark:border-[#30343A] flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#9CA3AF] dark:text-[#71717A]" />
                        Bandwidth
                      </span>
                      <strong className="text-[#202124] dark:text-[#F3F4F6] font-semibold">
                        {u.weekly_capacity_hours || 40}h / wk
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
