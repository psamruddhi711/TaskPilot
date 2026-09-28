import React, { useState, useEffect } from 'react';
import { X, FolderKanban, AlertCircle, Check } from 'lucide-react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProjectModal = ({ isOpen, onClose, onSuccess, initialData = null, users = [] }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    start_date: '',
    deadline: '',
    status: 'Planning'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData && initialData.id);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        manager_id: initialData.manager_id || initialData.manager?.id || '',
        start_date: initialData.start_date || '',
        deadline: initialData.deadline || '',
        status: initialData.status || 'Planning'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        manager_id: currentUser ? currentUser.id : '',
        start_date: '',
        deadline: '',
        status: 'Planning'
      });
    }
    setError('');
  }, [initialData, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Project name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        manager_id: formData.manager_id ? parseInt(formData.manager_id, 10) : currentUser.id,
        start_date: formData.start_date || null,
        deadline: formData.deadline || null,
        status: formData.status
      };

      if (isEditing) {
        await projectAPI.updateProject(initialData.id, payload);
      } else {
        await projectAPI.createProject(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#30343A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/30">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">
                {isEditing ? 'Edit Project' : 'Create Project'}
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                {isEditing ? 'Update workspace parameters' : 'Initialize a new project workspace'}
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
              Project Name <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Core API Modernization"
              required
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Outline project scope, objectives, or architecture..."
              className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Project Manager
              </label>
              <select
                name="manager_id"
                value={formData.manager_id}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {users.length > 0 ? (
                  users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))
                ) : (
                  <option value={currentUser?.id}>
                    {currentUser?.name} ({currentUser?.role})
                  </option>
                )}
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
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

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
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
                Target Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5E7EB] dark:border-[#30343A]">
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
              <span>{loading ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
