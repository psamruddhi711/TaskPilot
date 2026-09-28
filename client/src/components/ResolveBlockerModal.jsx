import React, { useState } from 'react';
import { blockerAPI } from '../services/api';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ResolveBlockerModal = ({ isOpen, blocker, onClose, onResolved }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [nextStatus, setNextStatus] = useState('In Progress');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !blocker) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError('Please provide resolution notes explaining how the blocker was resolved.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await blockerAPI.resolveBlocker(blocker.id, {
        resolution_notes: resolutionNotes.trim(),
        next_status: nextStatus
      });
      if (onResolved) onResolved(res.blocker);
      onClose();
    } catch (err) {
      console.error('Error resolving blocker:', err);
      setError(err.message || 'Failed to resolve blocker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#30343A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Resolve Blocker</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Mark impediment as resolved and resume task workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] p-1 rounded-md hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-md text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Blocker Context Card */}
          <div className="bg-[#F1F3F5] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">Target Task</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-white dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-[#30343A]">
                {blocker.task?.project?.name || 'Project'}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
              {blocker.task?.title || `Task #${blocker.task_id}`}
            </div>
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#30343A]">
              <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] block mb-1">Blocker Reason:</span>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 italic bg-amber-50 dark:bg-amber-500/10 p-2 rounded border border-amber-200 dark:border-amber-500/20">
                "{blocker.reason}"
              </p>
            </div>
          </div>

          {/* Resolution Notes Input */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
              Resolution Summary / Actions Taken <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how this blocker was unblocked (e.g. API credentials provisioned, spec clarified)..."
              required
              className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Next Task Status */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
              Update Task Status To:
            </label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="In Progress">In Progress (Ready to resume)</option>
              <option value="To Do">To Do (Queued)</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#30343A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] rounded-md hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md transition flex items-center gap-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Resolving...</span>
                </>
              ) : (
                <span>Confirm Resolution</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveBlockerModal;
