import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectAPI, userAPI } from '../services/api';
import { ProjectModal } from '../components/ProjectModal';
import { AddMemberModal } from '../components/AddMemberModal';
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
  Sparkles
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

export const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await projectAPI.getProject(id);
      if (res.success) {
        setProject(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await userAPI.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
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

      {/* Project Members Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Project Members</h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                {project.members?.length || 0}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Allocated team members and their designated project roles
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.98] transition"
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
              Add engineers, designers, and managers to this project workspace to assign tasks and balance workload.
            </p>
            {canManage && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </button>
            )}
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
                    {/* Top Row: Avatar + Name + Remove button */}
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

                  {/* Capacity indicator */}
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
    </div>
  );
};
