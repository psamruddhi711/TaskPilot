import React, { useState } from 'react';
import { blockerAPI } from '../services/api';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-scaleUp">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-emerald-950/30 to-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Resolve Blocker</h3>
              <p className="text-xs text-slate-400">Mark issue as resolved and resume task workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Blocker Context Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Task</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {blocker.task?.project?.name || 'Project'}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {blocker.task?.title || `Task #${blocker.task_id}`}
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Blocker Reason:</span>
              <p className="text-xs text-amber-300/90 italic bg-amber-950/20 p-2.5 rounded-lg border border-amber-800/30">
                "{blocker.reason}"
              </p>
            </div>
          </div>

          {/* Resolution Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Resolution Summary / Actions Taken <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how this blocker was unblocked (e.g., API credentials provisioned, spec clarified)..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
            />
          </div>

          {/* Next Task Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Update Task Status To:
            </label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
            >
              <option value="In Progress">In Progress (Ready to resume)</option>
              <option value="To Do">To Do (Queued)</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-2 transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Resolving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Confirm Resolution</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveBlockerModal;
