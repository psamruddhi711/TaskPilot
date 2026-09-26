import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  FolderKanban,
  Check,
  X,
  Search,
  RefreshCw,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { decisionAPI } from '../services/api';

const STATUS_BADGES = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  accepted: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

export const Handoffs = () => {
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchHandoffs = async () => {
    try {
      setLoading(true);
      const res = await decisionAPI.getMyHandoffs();
      setHandoffs(res || []);
    } catch (err) {
      console.error('Error fetching handoffs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffs();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setActionLoadingId(id);
      await decisionAPI.updateHandoffStatus(id, newStatus);
      setHandoffs((prev) =>
        prev.map((h) => (h.id === id ? { ...h, handoff_status: newStatus } : h))
      );
    } catch (err) {
      alert(err.message || 'Failed to update handoff status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredHandoffs = handoffs.filter((h) => {
    if (statusFilter !== 'all' && h.handoff_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = h.task?.title?.toLowerCase() || '';
      const summary = h.change_summary?.toLowerCase() || '';
      const action = h.next_action?.toLowerCase() || '';
      return title.includes(q) || summary.includes(q) || action.includes(q);
    }
    return true;
  });

  const pendingCount = handoffs.filter((h) => h.handoff_status === 'pending').length;
  const acceptedCount = handoffs.filter((h) => h.handoff_status === 'accepted').length;
  const completedCount = handoffs.filter((h) => h.handoff_status === 'completed').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">My Action Handoffs</h2>
            <p className="text-xs text-slate-400">
              Deliverables, decision handoffs, and follow-up items assigned to you
            </p>
          </div>
        </div>

        <button
          onClick={fetchHandoffs}
          className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Pending Acceptance
            </span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{pendingCount}</span>
            <span className="text-xs text-amber-400 font-medium">Awaiting your review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
              Accepted / In Progress
            </span>
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <GitPullRequest className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{acceptedCount}</span>
            <span className="text-xs text-sky-400 font-medium">Active handoffs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{completedCount}</span>
            <span className="text-xs text-emerald-400 font-medium">Handoffs resolved</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search handoffs by task title or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          {['all', 'pending', 'accepted', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1 font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Handoff Cards List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : filteredHandoffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
            <UserCheck className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Handoffs Found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'No handoffs match the current filters.'
              : 'You currently have no pending handoffs assigned.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHandoffs.map((h) => {
            const isPending = h.handoff_status === 'pending';
            const isAccepted = h.handoff_status === 'accepted';
            const isCompleted = h.handoff_status === 'completed';

            return (
              <div
                key={h.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4 shadow-lg hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                        STATUS_BADGES[h.handoff_status] || STATUS_BADGES.pending
                      }`}
                    >
                      {h.handoff_status}
                    </span>

                    <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                      {h.task?.project?.name || 'Project'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Assigned {new Date(h.decided_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Task Title & Summary */}
                <div>
                  <Link
                    to={`/tasks/${h.task?.id}`}
                    className="text-base font-bold text-white hover:text-indigo-400 transition flex items-center gap-1.5 group"
                  >
                    <span>{h.task?.title || `Task #${h.task_id}`}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                  </Link>
                  <p className="text-xs text-slate-300 mt-1">{h.change_summary}</p>
                </div>

                {/* Next Action Box */}
                <div className="rounded-xl bg-indigo-950/30 p-3.5 border border-indigo-900/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                    Action Required:
                  </span>
                  <p className="text-xs text-slate-100 font-medium leading-relaxed">
                    {h.next_action || 'Review and take ownership of deliverable'}
                  </p>
                  {h.next_action_due_at && (
                    <div className="text-[11px] text-amber-300 flex items-center gap-1 pt-1">
                      <span>Due date: {h.next_action_due_at}</span>
                    </div>
                  )}
                </div>

                {/* Decision Context */}
                {h.reason && (
                  <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">Decision Rationale:</span>
                    <p className="italic">"{h.reason}"</p>
                  </div>
                )}

                {/* Footer & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="text-xs text-slate-500">
                    Decided by: <strong className="text-slate-300">{h.decider?.name || 'Manager'}</strong>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(h.id, 'accepted')}
                        disabled={actionLoadingId === h.id}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md transition flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Handoff</span>
                      </button>
                    )}

                    {(isPending || isAccepted) && (
                      <button
                        onClick={() => handleUpdateStatus(h.id, 'completed')}
                        disabled={actionLoadingId === h.id}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Handoffs;
