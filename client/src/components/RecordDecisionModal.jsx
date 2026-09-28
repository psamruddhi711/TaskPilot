import React, { useState } from 'react';
import { taskAPI } from '../services/api';
import { GitPullRequest, UserCheck, AlertCircle, X } from 'lucide-react';

const DECISION_TYPES = [
  { value: 'requirement_change', label: 'Requirement / Spec Change' },
  { value: 'architectural_decision', label: 'Architectural / Tech Decision' },
  { value: 'priority_rescoping', label: 'Priority / Scope Adjustment' },
  { value: 'reassignment', label: 'Assignee & Ownership Handoff' },
  { value: 'deadline_change', label: 'Deadline & Timeline Adjustment' },
  { value: 'general_decision', label: 'General Team Decision' }
];

export const RecordDecisionModal = ({ isOpen, task, members = [], onClose, onDecisionCreated, initialData = null, onCustomSubmit = null }) => {
  const [decisionType, setDecisionType] = useState('requirement_change');
  const [changeSummary, setChangeSummary] = useState('');
  const [reason, setReason] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextOwnerId, setNextOwnerId] = useState('');
  const [nextActionDueAt, setNextActionDueAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDecisionType(initialData.decision_type || 'reassignment');
        setChangeSummary(initialData.change_summary || '');
        setReason(initialData.reason || '');
        setNextAction(initialData.next_action || '');
        setNextOwnerId(initialData.next_owner_id !== undefined ? String(initialData.next_owner_id) : '');
        setNextActionDueAt(initialData.next_action_due_at || '');
      } else {
        setDecisionType('requirement_change');
        setChangeSummary('');
        setReason('');
        setNextAction('');
        setNextOwnerId('');
        setNextActionDueAt('');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!changeSummary.trim()) {
      setError('Please provide a brief summary of what was decided or changed.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a clear reason / context for this decision.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = {
        decision_type: decisionType,
        change_summary: changeSummary.trim(),
        reason: reason.trim(),
        next_action: nextAction.trim() || null,
        next_owner_id: nextOwnerId ? parseInt(nextOwnerId, 10) : null,
        next_action_due_at: nextActionDueAt || null,
        handoff_status: 'pending'
      };

      if (onCustomSubmit) {
        await onCustomSubmit(payload);
      } else {
        const res = await taskAPI.createTaskDecision(task.id, payload);
        if (onDecisionCreated) onDecisionCreated(res.decision);
      }
      onClose();
    } catch (err) {
      console.error('Error logging decision:', err);
      setError(err.message || 'Failed to record decision log');
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
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8]">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Record Decision & Handoff</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Append an immutable decision audit log entry</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-md text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Info Pill */}
          <div className="bg-[#F1F3F5] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md p-3 text-xs flex items-center justify-between">
            <span className="text-[#6B7280] dark:text-[#A1A1AA]">Task: <strong className="text-[#202124] dark:text-[#F3F4F6]">{task.title}</strong></span>
            <span className="text-[#6B7280] dark:text-[#A1A1AA]">Status: <strong className="text-[#4F46E5] dark:text-[#818CF8]">{task.status}</strong></span>
          </div>

          {/* Decision Type */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
              Decision Category
            </label>
            <select
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value)}
              className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
            >
              {DECISION_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Change Summary */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
              Change / Decision Summary <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="e.g. Switched auth provider to JWT with bcrypt hashing..."
              required
              className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Reason / Context */}
          <div>
            <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
              Why / Decision Rationale <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the technical or business rationale behind this choice..."
              required
              className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Handoff Section */}
          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#30343A] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8]">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Next Action & Handoff (Optional)</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
                Next Action / Deliverable
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Implement schema migration and review PR..."
                className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
                  Next Owner
                </label>
                <select
                  value={nextOwnerId}
                  onChange={(e) => setNextOwnerId(e.target.value)}
                  className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Unassigned --</option>
                  {members.map((m) => {
                    const u = m.user || m;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role || 'Member'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
                  Action Due Date
                </label>
                <input
                  type="date"
                  value={nextActionDueAt}
                  onChange={(e) => setNextActionDueAt(e.target.value)}
                  className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
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
              className="px-4 py-2 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 rounded-md transition shadow-sm"
            >
              {loading ? 'Recording...' : 'Commit Decision to History'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordDecisionModal;
