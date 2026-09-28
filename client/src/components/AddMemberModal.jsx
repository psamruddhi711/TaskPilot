import React, { useState, useMemo } from 'react';
import { X, UserPlus, Search, Check, AlertCircle, Shield, Clock } from 'lucide-react';
import { projectAPI } from '../services/api';

export const AddMemberModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  existingMemberUserIds = [],
  availableUsers = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [projectRole, setProjectRole] = useState('Developer');
  const [customRole, setCustomRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter out users already in this project
  const eligibleUsers = useMemo(() => {
    return availableUsers.filter((u) => !existingMemberUserIds.includes(u.id));
  }, [availableUsers, existingMemberUserIds]);

  // Search filter
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return eligibleUsers;
    const term = searchTerm.toLowerCase();
    return eligibleUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
    );
  }, [eligibleUsers, searchTerm]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a user to add to the project.');
      return;
    }

    const assignedRole = projectRole === 'Custom' ? customRole.trim() : projectRole;
    if (!assignedRole) {
      setError('Please specify a project role.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await projectAPI.addProjectMember(projectId, {
        user_id: selectedUserId,
        project_role: assignedRole
      });
      onSuccess();
      onClose();
      // Reset
      setSelectedUserId(null);
      setSearchTerm('');
      setProjectRole('Developer');
      setCustomRole('');
    } catch (err) {
      setError(err.message || 'Failed to add project member.');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#30343A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/30">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Add Project Member</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Enroll team members and assign project responsibilities</p>
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
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-2.5 text-xs text-red-700 dark:text-red-300 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex-1 flex flex-col min-h-0 space-y-4">
          {/* User Search & Selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1">
              Select User from Directory
            </label>
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] py-2 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Scrollable User List */}
            <div className="flex-1 min-h-[150px] max-h-[200px] overflow-y-auto space-y-1 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5]/50 dark:bg-[#181A1D]/70 p-2">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                  {eligibleUsers.length === 0
                    ? 'All registered users are already members of this project.'
                    : 'No matching users found.'}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition border ${
                        isSelected
                          ? 'border-[#4F46E5] dark:border-[#818CF8] bg-indigo-50 dark:bg-indigo-950/40 text-[#202124] dark:text-[#F3F4F6]'
                          : 'border-transparent hover:bg-white dark:hover:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F1F3F5] dark:bg-[#25292E] text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] border border-[#E5E7EB] dark:border-[#30343A]">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{u.name}</p>
                          <p className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                          {u.role}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected User Summary Banner */}
          {selectedUser && (
            <div className="rounded-md border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-950/20 p-2.5 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                <span className="text-[#6B7280] dark:text-[#A1A1AA]">Selected: <strong className="text-[#202124] dark:text-[#F3F4F6]">{selectedUser.name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#A1A1AA] text-[11px]">
                <Clock className="h-3 w-3 text-[#9CA3AF] dark:text-[#71717A]" />
                <span>{selectedUser.weekly_capacity_hours}h cap</span>
              </div>
            </div>
          )}

          {/* Project Role Assignment */}
          <div className="shrink-0 space-y-1.5">
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6]">
              Assigned Project Role
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {['Developer', 'Designer', 'QA Engineer', 'Lead', 'DevOps', 'Product', 'Member', 'Custom'].map(
                (role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setProjectRole(role)}
                    className={`rounded-md py-1.5 px-2 text-xs font-medium border transition ${
                      projectRole === role
                        ? 'border-[#4F46E5] dark:border-[#818CF8] bg-[#4F46E5] text-white shadow-xs'
                        : 'border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
                    }`}
                  >
                    {role}
                  </button>
                )
              )}
            </div>

            {projectRole === 'Custom' && (
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Enter custom project role title..."
                className="mt-1.5 w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB] dark:border-[#30343A] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-4 py-2 text-xs font-medium text-white shadow-sm disabled:opacity-50 transition"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{loading ? 'Adding...' : 'Add to Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
