import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  FolderKanban,
  User,
  Plus,
  Lock
} from 'lucide-react';
import { blockerAPI, projectAPI, taskAPI } from '../services/api';
import ResolveBlockerModal from '../components/ResolveBlockerModal';
import ReportBlockerModal from '../components/ReportBlockerModal';

export const Blockers = () => {
  const [blockers, setBlockers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, active, escalated, resolved
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [resolvingBlocker, setResolvingBlocker] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedTaskForBlocker, setSelectedTaskForBlocker] = useState(null);

  const fetchBlockerData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus === 'active') params.status = 'active';
      else if (selectedStatus === 'escalated') params.status = 'escalated';
      else if (selectedStatus === 'resolved') params.status = 'resolved';
      else params.status = 'active,escalated,resolved';

      if (selectedProject !== 'all') params.projectId = selectedProject;

      const [blockersRes, projectsRes, tasksRes] = await Promise.all([
        blockerAPI.getBlockers(params).catch(() => []),
        projectAPI.getProjects().catch(() => ({ data: [] })),
        taskAPI.getTasks().catch(() => ({ data: [] }))
      ]);

      const blockerList = Array.isArray(blockersRes)
        ? blockersRes
        : (blockersRes?.data || blockersRes?.blockers || []);
      const projectList = Array.isArray(projectsRes)
        ? projectsRes
        : (projectsRes?.data || []);
      const taskList = Array.isArray(tasksRes)
        ? tasksRes
        : (tasksRes?.data || []);

      setBlockers(blockerList);
      setProjects(projectList);
      setAllTasks(taskList);
    } catch (err) {
      console.error('Error loading blockers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockerData();
  }, [selectedStatus, selectedProject]);

  const handleResolveSuccess = (updatedBlocker) => {
    setBlockers((prev) =>
      prev.map((b) => (b.id === updatedBlocker.id ? updatedBlocker : b))
    );
  };

  const handleBlockerCreated = (res) => {
    fetchBlockerData();
  };

  // Helper to format elapsed time
  const formatElapsedTime = (dateStr, resolvedAtStr) => {
    if (!dateStr) return '';
    const start = new Date(dateStr).getTime();
    const end = resolvedAtStr ? new Date(resolvedAtStr).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return `${diffDays}d ${remainingHours}h elapsed`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m elapsed`;
    }
    return `${diffMins}m elapsed`;
  };

  // Filtered blockers
  const filteredBlockers = blockers.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const taskTitle = b.task?.title?.toLowerCase() || '';
      const reason = b.reason?.toLowerCase() || '';
      const projectName = b.task?.project?.name?.toLowerCase() || '';
      return taskTitle.includes(q) || reason.includes(q) || projectName.includes(q);
    }
    return true;
  });

  // Calculate stats
  const activeCount = blockers.filter((b) => b.status === 'active').length;
  const escalatedCount = blockers.filter((b) => b.status === 'escalated').length;
  const resolvedCount = blockers.filter((b) => b.status === 'resolved').length;
  
  // Total unique downstream affected tasks across open blockers
  const totalImpactedTasks = blockers
    .filter((b) => b.status === 'active' || b.status === 'escalated')
    .reduce((sum, b) => sum + (b.downstream_affected_count || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Blocker Center</h2>
              <p className="text-xs text-slate-400">
                Impediment triage, automated 24h/48h escalation monitoring & graph impact analysis
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBlockerData}
            title="Refresh Blockers"
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (allTasks.length > 0) {
                setSelectedTaskForBlocker(allTasks[0]);
                setReportModalOpen(true);
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-lg shadow-rose-950 transition"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Report Blocker</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Escalated */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
              Critical Escalated
            </span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{escalatedCount}</span>
            <span className="text-xs text-rose-400 font-medium">Overdue &gt; 48h</span>
          </div>
        </div>

        {/* Active Blockers */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Active Blockers
            </span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{activeCount}</span>
            <span className="text-xs text-amber-400 font-medium">Under monitoring</span>
          </div>
        </div>

        {/* Downstream Impact */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Downstream Impact
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalImpactedTasks}</span>
            <span className="text-xs text-indigo-400 font-medium">Affected tasks</span>
          </div>
        </div>

        {/* Resolved Blockers */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Resolved
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{resolvedCount}</span>
            <span className="text-xs text-emerald-400 font-medium">Unblocked successfully</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by task title, reason, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {['all', 'active', 'escalated', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`rounded-lg px-3 py-1 font-medium capitalize transition ${
                  selectedStatus === st
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-rose-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Blocker List / Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : filteredBlockers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Blockers Found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {searchQuery || selectedStatus !== 'all'
              ? 'No blockers match your current filters. Try changing filter criteria.'
              : 'All workflows are proceeding without reported impediments.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBlockers.map((b) => {
            const isEscalated = b.status === 'escalated';
            const isActive = b.status === 'active';
            const isResolved = b.status === 'resolved';
            const impactedCount = b.downstream_affected_count || 0;

            return (
              <div
                key={b.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isEscalated
                    ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-900 shadow-lg shadow-rose-950/30'
                    : isActive
                    ? 'border-amber-500/30 bg-slate-900/80 shadow-md'
                    : 'border-slate-800 bg-slate-900/40 opacity-80'
                }`}
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar inside Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Status Badge */}
                      {isEscalated && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold tracking-wide animate-pulse">
                          <Flame className="w-3.5 h-3.5" />
                          ESCALATED
                        </span>
                      )}
                      {isActive && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ACTIVE BLOCKER
                        </span>
                      )}
                      {isResolved && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          RESOLVED
                        </span>
                      )}

                      {/* Project Name */}
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                        {b.task?.project?.name || 'Project'}
                      </span>

                      {/* Downstream Impact Badge */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                          impactedCount > 0
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{impactedCount} downstream affected</span>
                      </span>
                    </div>

                    {/* Elapsed Time */}
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>{formatElapsedTime(b.blocked_at, b.resolved_at)}</span>
                    </div>
                  </div>

                  {/* Task Title & Details */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <Link
                        to={`/tasks/${b.task?.id}`}
                        className="text-base font-bold text-white hover:text-indigo-400 transition flex items-center gap-1.5 group"
                      >
                        <span>{b.task?.title || `Task #${b.task_id}`}</span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition transform group-hover:translate-x-0.5" />
                      </Link>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>
                          Priority: <strong className="text-slate-300">{b.task?.priority}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Assignee:{' '}
                          <strong className="text-slate-300">
                            {b.task?.assignee?.name || 'Unassigned'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Resolve Button */}
                    {!isResolved && (
                      <button
                        onClick={() => setResolvingBlocker(b)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-2 transition shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Resolve Blocker</span>
                      </button>
                    )}
                  </div>

                  {/* Blocker Reason Box */}
                  <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Blocker Reason:
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
                      "{b.reason}"
                    </p>
                  </div>

                  {/* Downstream Affected Tasks Preview */}
                  {b.downstream_tasks && b.downstream_tasks.length > 0 && (
                    <div className="rounded-xl bg-indigo-950/20 p-3.5 border border-indigo-900/40 space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 block">
                        Impacted Downstream Deliverables ({b.downstream_tasks.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {b.downstream_tasks.map((dt) => (
                          <Link
                            key={dt.id}
                            to={`/tasks/${dt.id}`}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between transition text-xs"
                          >
                            <span className="text-white font-medium truncate">{dt.title}</span>
                            <span className="text-[10px] text-slate-400 ml-2 shrink-0">{dt.status}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Notes (if resolved) */}
                  {isResolved && b.resolution_notes && (
                    <div className="rounded-xl bg-emerald-950/30 p-3.5 border border-emerald-800/40">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                        Resolution Notes:
                      </span>
                      <p className="text-xs text-emerald-200 leading-relaxed">
                        {b.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Escalation History Trail */}
                  {b.escalationEvents && b.escalationEvents.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-500">Escalation Events:</span>
                      {b.escalationEvents.map((evt) => (
                        <span
                          key={evt.id}
                          className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                            evt.event_type === 'escalated'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {evt.event_type === 'escalated' ? '🚨 48h Escalation Triggered' : '⚠️ 24h Warning Dispatched'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Blocker Modal */}
      {resolvingBlocker && (
        <ResolveBlockerModal
          isOpen={!!resolvingBlocker}
          blocker={resolvingBlocker}
          onClose={() => setResolvingBlocker(null)}
          onResolved={handleResolveSuccess}
        />
      )}

      {/* Report Blocker Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Select Task to Report Blocker</span>
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Task
              </label>
              <select
                value={selectedTaskForBlocker?.id || ''}
                onChange={(e) => {
                  const task = allTasks.find((t) => t.id === parseInt(e.target.value));
                  setSelectedTaskForBlocker(task);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {allTasks
                  .filter((t) => t.status !== 'Completed')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status}) - {t.project?.name || 'Project'}
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setReportModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition"
              >
                Continue to Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Blocker Modal */}
      {selectedTaskForBlocker && !reportModalOpen && (
        <ReportBlockerModal
          isOpen={!!selectedTaskForBlocker}
          task={selectedTaskForBlocker}
          onClose={() => setSelectedTaskForBlocker(null)}
          onBlockerCreated={handleBlockerCreated}
        />
      )}
    </div>
  );
};
