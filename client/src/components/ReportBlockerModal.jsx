import React, { useState } from 'react';
import { taskAPI } from '../services/api';
import { AlertTriangle, AlertCircle, X, ShieldAlert } from 'lucide-react';

const ReportBlockerModal = ({ isOpen, task, onClose, onBlockerCreated }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a detailed reason for why this task is blocked.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await taskAPI.createTaskBlocker(task.id, reason.trim());
      if (onBlockerCreated) onBlockerCreated(res);
      onClose();
    } catch (err) {
      console.error('Error reporting blocker:', err);
      setError(err.message || 'Failed to report blocker');
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
            <div className="w-8 h-8 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Mark Task as Blocked</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Report an impediment to start escalation monitoring</p>
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

          {/* Task Info Banner */}
          <div className="bg-[#F1F3F5] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md p-3 space-y-1">
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">Affected Task</span>
            <div className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{task.title}</div>
            <div className="text-xs text-[#6B7280] dark:text-[#A1A1AA] flex items-center gap-2 pt-0.5">
              <span>Priority: <strong className="text-[#202124] dark:text-[#F3F4F6]">{task.priority}</strong></span>
              <span>•</span>
              <span>Assignee: <strong className="text-[#202124] dark:text-[#F3F4F6]">{task.assignee?.name || 'Unassigned'}</strong></span>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
              Blocker Description / Reason <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What is blocking this task? (e.g. waiting for external API access, spec clarification, dependency failure)..."
              required
              className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-red-500 transition"
            />
            <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
              Submitting changes task status to <strong className="text-red-600 dark:text-red-400 font-medium">Blocked</strong> and starts the SLA resolution timer.
            </p>
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
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-md transition flex items-center gap-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Marking Blocked...</span>
                </>
              ) : (
                <span>Mark as Blocked</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportBlockerModal;
