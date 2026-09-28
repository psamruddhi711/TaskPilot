import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  UserCheck,
  FolderKanban,
  Check,
  Search,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { decisionAPI } from '../services/api';

const STATUS_BADGES = {
  pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
  accepted: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40',
  completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
  cancelled: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#202124] dark:text-[#F3F4F6] tracking-tight">Action Handoffs</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            Deliverables, decision handoffs, and follow-up items assigned to you
          </p>
        </div>

        <button
          onClick={fetchHandoffs}
          title="Refresh Handoffs"
          className="p-2 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Pending Acceptance</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{pendingCount}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Awaiting your review</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Accepted / In Progress</span>
            <GitPullRequest className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{acceptedCount}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Active handoffs</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{completedCount}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Handoffs resolved</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
          <input
            type="text"
            placeholder="Search handoffs by task title or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] py-1.5 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] p-0.5 border border-[#E5E7EB] dark:border-[#30343A] text-xs">
          {['all', 'pending', 'accepted', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-white dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Handoff Cards List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        </div>
      ) : filteredHandoffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-12 text-center shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] mb-2 border border-indigo-200 dark:border-indigo-800/30">
            <UserCheck className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">No Handoffs Found</h2>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'No handoffs match the current filters.'
              : 'You currently have no pending handoffs assigned.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHandoffs.map((h) => {
            const isPending = h.handoff_status === 'pending';
            const isAccepted = h.handoff_status === 'accepted';
            const isCompleted = h.handoff_status === 'completed';

            return (
              <div
                key={h.id}
                className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider ${
                        STATUS_BADGES[h.handoff_status] || STATUS_BADGES.pending
                      }`}
                    >
                      {h.handoff_status}
                    </span>

                    <span className="flex items-center gap-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5] dark:bg-[#181A1D] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                      <FolderKanban className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" />
                      {h.task?.project?.name || 'Project'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5] dark:bg-[#181A1D] px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#30343A] w-fit">
                    <Clock className="w-3 h-3 text-[#9CA3AF] dark:text-[#71717A]" />
                    <span>Assigned {new Date(h.decided_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Task Title & Summary */}
                <div>
                  <Link
                    to={`/tasks/${h.task?.id}`}
                    className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] hover:text-[#4F46E5] dark:hover:text-[#818CF8] transition flex items-center gap-1 group"
                  >
                    <span>{h.task?.title || `Task #${h.task_id}`}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition" />
                  </Link>
                  <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">{h.change_summary}</p>
                </div>

                {/* Next Action Box */}
                <div className="rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] p-3 border border-[#E5E7EB] dark:border-[#30343A] space-y-1">
                  <span className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] uppercase tracking-wider block">
                    Action Required:
                  </span>
                  <p className="text-xs text-[#202124] dark:text-[#F3F4F6] leading-relaxed">
                    {h.next_action || 'Review and take ownership of deliverable'}
                  </p>
                  {h.next_action_due_at && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                      <span>Due date: {h.next_action_due_at}</span>
                    </div>
                  )}
                </div>

                {/* Decision Context */}
                {h.reason && (
                  <div className="text-xs text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5]/60 dark:bg-[#181A1D]/60 p-2.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A]">
                    <span className="text-[#9CA3AF] dark:text-[#71717A] block text-[11px] font-medium mb-0.5">Decision Rationale:</span>
                    <p className="italic">"{h.reason}"</p>
                  </div>
                )}

                {/* Footer & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[#E5E7EB] dark:border-[#30343A]">
                  <div className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                    Decided by: <strong className="text-[#202124] dark:text-[#F3F4F6] font-medium">{h.decider?.name || 'Manager'}</strong>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(h.id, 'accepted')}
                        disabled={actionLoadingId === h.id}
                        className="px-3 py-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-medium text-white transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Handoff</span>
                      </button>
                    )}

                    {(isPending || isAccepted) && (
                      <button
                        onClick={() => handleUpdateStatus(h.id, 'completed')}
                        disabled={actionLoadingId === h.id}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
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
