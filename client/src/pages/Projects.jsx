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
  Edit2,
  Trash2,
  AlertCircle,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#202124] dark:text-[#F3F4F6]">Project Workspaces</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Monitor deliverables, timelines, and cross-functional team assignments
          </p>
        </div>

        {canManageProjects ? (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-2 text-xs font-medium text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3 py-1.5 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />
            <span>View-only mode</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-3 md:flex-row md:items-center md:justify-between shadow-sm">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                selectedStatus === st
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] border border-[#E5E7EB] dark:border-[#30343A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] py-1.5 pl-8 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Project Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 animate-pulse rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-5"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-12 text-center shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] mb-3 border border-indigo-200 dark:border-indigo-800/30">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">No Projects Found</h3>
          <p className="mt-1 max-w-sm text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            {searchTerm || selectedStatus !== 'All'
              ? 'Try adjusting your search query or filter criteria.'
              : 'Get started by creating your first project workspace.'}
          </p>
          {canManageProjects && (
            <button
              onClick={handleCreateNew}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-2 text-xs font-medium text-white shadow-sm transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusStyle =
              STATUS_CONFIG[project.status] || STATUS_CONFIG['Planning'];

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group relative flex flex-col justify-between rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-5 transition-all hover:border-[#D1D5DB] dark:hover:border-[#4B5563] cursor-pointer shadow-sm"
              >
                <div>
                  {/* Top Status & Action Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {project.status}
                    </span>

                    {canManageProjects && (
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEdit(e, project)}
                          title="Edit Project"
                          className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-[#F3F4F6] transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          title="Delete Project"
                          className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-3 text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] line-clamp-2 leading-relaxed">
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>

                {/* Footer Metadata */}
                <div className="mt-5 space-y-2.5 pt-3.5 border-t border-[#E5E7EB] dark:border-[#30343A] text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-[#F1F3F5] dark:bg-[#25292E] text-[10px] font-semibold text-[#4F46E5] dark:text-[#818CF8] border border-[#E5E7EB] dark:border-[#30343A]">
                        {project.manager?.name?.charAt(0) || 'M'}
                      </div>
                      <span className="truncate max-w-[130px] text-[#202124] dark:text-[#F3F4F6] text-xs">
                        {project.manager?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#A1A1AA] text-xs">
                      <Users className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                      <span>{project.membersCount || 0} members</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                      <span>Due {project.deadline || 'TBD'}</span>
                    </div>

                    <span className="flex items-center gap-1 text-[#4F46E5] dark:text-[#818CF8] font-medium group-hover:translate-x-0.5 transition-transform">
                      View <ArrowRight className="h-3 w-3" />
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
