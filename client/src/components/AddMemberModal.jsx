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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 md:p-8 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Add Project Member</h3>
              <p className="text-xs text-slate-400">Enroll team members and assign project responsibilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex-1 flex flex-col min-h-0 space-y-4">
          {/* User Search & Selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select User from Directory
            </label>
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Scrollable User List */}
            <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {eligibleUsers.length === 0
                    ? 'All existing registered users are already members of this project.'
                    : 'No matching users found.'}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition border ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                          : 'border-transparent hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/40 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          {u.role}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected User Summary Banner */}
          {selectedUser && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span className="text-slate-300">Selected: <strong className="text-white">{selectedUser.name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>{selectedUser.weekly_capacity_hours}h cap</span>
              </div>
            </div>
          )}

          {/* Project Role Assignment */}
          <div className="shrink-0 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Assigned Project Role
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {['Developer', 'Designer', 'QA Engineer', 'Lead', 'DevOps', 'Product', 'Member', 'Custom'].map(
                (role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setProjectRole(role)}
                    className={`rounded-xl py-2 px-2 text-xs font-medium border transition ${
                      projectRole === role
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
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
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>{loading ? 'Adding...' : 'Add to Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
