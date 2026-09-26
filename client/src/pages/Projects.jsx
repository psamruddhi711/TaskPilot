import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectAPI, userAPI } from '../services/api';
import { ProjectModal } from '../components/ProjectModal';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Users,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
  Layers,
  ArrowRight
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

export const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const canManageProjects = user?.role === 'Admin' || user?.role === 'Project Manager';

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await projectAPI.getProjects(params);
      if (res.success) {
        setProjects(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch user directory for manager dropdown:', err.message);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedStatus]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project and all its member associations?')) {
      return;
    }

    try {
      await projectAPI.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const handleEdit = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const statusOptions = ['All', 'Planning', 'In Progress', 'Completed', 'On Hold'];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Project Workspaces</h2>
          <p className="text-xs text-slate-400">
            Monitor deliverables, timelines, and cross-functional team assignments
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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

      {/* Project Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 animate-pulse rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
            <FolderKanban className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Projects Found</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-400">
            {searchTerm || selectedStatus !== 'All'
              ? 'Try changing your search keywords or filter criteria.'
              : 'Get started by creating your first project workspace.'}
          </p>
          {canManageProjects && (
            <button
              onClick={handleCreateNew}
              className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusStyle =
              STATUS_CONFIG[project.status] || STATUS_CONFIG['Planning'];

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 transition-all hover:border-indigo-500/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer backdrop-blur-sm"
              >
                <div>
                  {/* Top Status & Controls */}
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {project.status}
                    </span>

                    {canManageProjects && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleEdit(e, project)}
                          title="Edit Project"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          title="Delete Project"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>

                {/* Footer Metadata */}
                <div className="mt-6 space-y-3 pt-4 border-t border-slate-800/70">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/30 text-[10px] font-bold text-indigo-300">
                        {project.manager?.name?.charAt(0) || 'M'}
                      </div>
                      <span className="truncate max-w-[130px] text-slate-300 font-medium">
                        {project.manager?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-md bg-slate-950 px-2 py-0.5 border border-slate-800 text-[11px] text-slate-300">
                      <Users className="h-3 w-3 text-indigo-400" />
                      <span>{project.membersCount || 0} members</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>Due {project.deadline || 'TBD'}</span>
                    </div>

                    <span className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium">
                      Details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Create/Edit Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProjects}
        initialData={editingProject}
        users={users}
      />
    </div>
  );
};
