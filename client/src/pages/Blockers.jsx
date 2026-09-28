import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Search,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  FolderKanban,
  X
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#202124] dark:text-[#F3F4F6] tracking-tight">Blocker Center</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            Impediment triage, automated SLA escalation monitoring, and downstream graph impact
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBlockerData}
            title="Refresh Blockers"
            className="p-2 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition shadow-xs"
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
            className="flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-500 px-3.5 py-2 text-xs font-medium text-white transition shadow-sm"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Report Blocker</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Escalated */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Critical Escalated</span>
            <Flame className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-red-600 dark:text-red-400">{escalatedCount}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">&gt; 48h SLA</span>
          </div>
        </div>

        {/* Active Blockers */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Active Blockers</span>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{activeCount}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Under monitoring</span>
          </div>
        </div>

        {/* Downstream Impact */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Downstream Impact</span>
            <ArrowUpRight className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{totalImpactedTasks}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Affected tasks</span>
          </div>
        </div>

        {/* Resolved Blockers */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{resolvedCount}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Unblocked</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
          <input
            type="text"
            placeholder="Search by task title, reason, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] py-1.5 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] p-0.5 border border-[#E5E7EB] dark:border-[#30343A] text-xs">
            {['all', 'active', 'escalated', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition ${
                  selectedStatus === st
                    ? 'bg-white dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] shadow-xs'
                    : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
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
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
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

      {/* Blocker List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        </div>
      ) : filteredBlockers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-12 text-center shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-200 dark:border-emerald-800/30">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">No Blockers Found</h2>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm">
            {searchQuery || selectedStatus !== 'all'
              ? 'No blockers match your current filters. Try changing filter criteria.'
              : 'All workflows are proceeding without reported impediments.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBlockers.map((b) => {
            const isEscalated = b.status === 'escalated';
            const isActive = b.status === 'active';
            const isResolved = b.status === 'resolved';
            const impactedCount = b.downstream_affected_count || 0;

            return (
              <div
                key={b.id}
                className={`rounded-lg border bg-white dark:bg-[#1C1F23] p-4 space-y-3 transition-colors shadow-sm ${
                  isEscalated
                    ? 'border-red-300 dark:border-red-500/30'
                    : isActive
                    ? 'border-amber-300 dark:border-amber-500/30'
                    : 'border-[#E5E7EB] dark:border-[#30343A] opacity-80'
                }`}
              >
                {/* Top Bar inside Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {isEscalated && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-[11px] font-medium">
                        <Flame className="w-3 h-3 text-red-600 dark:text-red-400" />
                        Escalated
                      </span>
                    )}
                    {isActive && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        Active Blocker
                      </span>
                    )}
                    {isResolved && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Resolved
                      </span>
                    )}

                    {/* Project Name */}
                    <span className="flex items-center gap-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5] dark:bg-[#181A1D] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                      <FolderKanban className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" />
                      {b.task?.project?.name || 'Project'}
                    </span>

                    {/* Downstream Impact Badge */}
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${
                        impactedCount > 0
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50'
                          : 'bg-[#F1F3F5] dark:bg-[#181A1D] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>{impactedCount} downstream affected</span>
                    </span>
                  </div>

                  {/* Elapsed Time */}
                  <div className="flex items-center gap-1 text-xs text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5] dark:bg-[#181A1D] px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#30343A] w-fit">
                    <Clock className="w-3 h-3 text-[#9CA3AF] dark:text-[#71717A]" />
                    <span>{formatElapsedTime(b.blocked_at, b.resolved_at)}</span>
                  </div>
                </div>

                {/* Task Title & Details */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                  <div>
                    <Link
                      to={`/tasks/${b.task?.id}`}
                      className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] hover:text-[#4F46E5] dark:hover:text-[#818CF8] transition flex items-center gap-1 group"
                    >
                      <span>{b.task?.title || `Task #${b.task_id}`}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition" />
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                      <span>
                        Priority: <strong className="text-[#202124] dark:text-[#F3F4F6] font-medium">{b.task?.priority}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Assignee:{' '}
                        <strong className="text-[#202124] dark:text-[#F3F4F6] font-medium">
                          {b.task?.assignee?.name || 'Unassigned'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Resolve Button */}
                  {!isResolved && (
                    <button
                      onClick={() => setResolvingBlocker(b)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md flex items-center gap-1.5 transition shrink-0 self-start md:self-auto shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve Blocker</span>
                    </button>
                  )}
                </div>

                {/* Blocker Reason Box */}
                <div className="rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] p-3 border border-[#E5E7EB] dark:border-[#30343A]">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA] block mb-1">
                    Blocker Reason:
                  </span>
                  <p className="text-xs text-[#202124] dark:text-[#F3F4F6] leading-relaxed italic">
                    "{b.reason}"
                  </p>
                </div>

                {/* Downstream Affected Tasks Preview */}
                {b.downstream_tasks && b.downstream_tasks.length > 0 && (
                  <div className="rounded-md bg-[#F1F3F5]/60 dark:bg-[#181A1D]/60 p-3 border border-[#E5E7EB] dark:border-[#30343A] space-y-1.5">
                    <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] block">
                      Impacted Downstream Deliverables ({b.downstream_tasks.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {b.downstream_tasks.map((dt) => (
                        <Link
                          key={dt.id}
                          to={`/tasks/${dt.id}`}
                          className="p-1.5 rounded bg-white dark:bg-[#25292E] border border-[#E5E7EB] dark:border-[#30343A] hover:border-[#4F46E5] dark:hover:border-[#818CF8] flex items-center justify-between transition text-xs"
                        >
                          <span className="text-[#202124] dark:text-[#F3F4F6] truncate">{dt.title}</span>
                          <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] ml-2 shrink-0">{dt.status}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes (if resolved) */}
                {isResolved && b.resolution_notes && (
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 p-3 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block mb-0.5">
                      Resolution Notes:
                    </span>
                    <p className="text-xs text-[#202124] dark:text-[#F3F4F6] leading-relaxed">
                      {b.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Escalation History Trail */}
                {b.escalationEvents && b.escalationEvents.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                    <span className="text-[#9CA3AF] dark:text-[#71717A]">Escalation Events:</span>
                    {b.escalationEvents.map((evt) => (
                      <span
                        key={evt.id}
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                          evt.event_type === 'escalated'
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                        }`}
                      >
                        {evt.event_type === 'escalated' ? '48h Escalation Triggered' : '24h Warning Dispatched'}
                      </span>
                    ))}
                  </div>
                )}
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

      {/* Select Task for Report Blocker Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg shadow-xl w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-3">
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Select Task to Report Blocker</span>
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202124] dark:text-[#F3F4F6] mb-1.5">
                Target Task
              </label>
              <select
                value={selectedTaskForBlocker?.id || ''}
                onChange={(e) => {
                  const task = allTasks.find((t) => t.id === parseInt(e.target.value));
                  setSelectedTaskForBlocker(task);
                }}
                className="w-full bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-2 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-red-500"
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

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] rounded-md hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setReportModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition shadow-sm"
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

export default Blockers;
