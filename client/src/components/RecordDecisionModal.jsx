import React, { useState } from 'react';
import { taskAPI } from '../services/api';
import { GitPullRequest, ShieldCheck, UserCheck, Calendar, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Record Decision & Handoff</h3>
              <p className="text-xs text-slate-400">Append an immutable decision audit log entry and assign handoff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Info Pill */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between">
            <span className="text-slate-400">Task: <strong className="text-white">{task.title}</strong></span>
            <span className="text-slate-400">Status: <strong className="text-indigo-400">{task.status}</strong></span>
          </div>

          {/* Decision Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Decision Category
            </label>
            <select
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Change / Decision Summary <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="e.g. Switched auth provider to JWT with bcrypt hashing..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reason / Context */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Why / Decision Rationale <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the technical or business rationale behind this choice..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Handoff Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              <span>Next Action & Handoff (Optional)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Next Action / Deliverable
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Implement schema migration and review PR..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Next Owner
                </label>
                <select
                  value={nextOwnerId}
                  onChange={(e) => setNextOwnerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Action Due Date
                </label>
                <input
                  type="date"
                  value={nextActionDueAt}
                  onChange={(e) => setNextActionDueAt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-950 flex items-center gap-2 transition"
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
