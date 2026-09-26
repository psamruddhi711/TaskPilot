import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, projectAPI } from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  FolderKanban,
  CheckSquare,
  Users,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  GitPullRequest,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Flame,
  RefreshCw,
  UserCheck
} from 'lucide-react';

const PRIORITY_BADGES = {
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Critical: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
};

const STATUS_BADGES = {
  'To Do': 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  'In Progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  Blocked: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  'In Review': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

const DECISION_BADGES = {
  requirement_change: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  architectural_decision: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  priority_rescoping: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  reassignment: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  skill_based_assignment: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  deadline_change: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  blocker_resolution: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  task_blocked: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  status_change: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

// Custom Chart Tooltips
const CustomProjectTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
        <p className="font-bold text-white text-sm">{data.name}</p>
        <p className="text-emerald-400 font-semibold">Progress: {data.progress_percent}%</p>
        <p className="text-slate-300">Completed: {data.completed_tasks} / {data.total_tasks} Tasks</p>
        <p className="text-slate-400">Status: {data.status}</p>
      </div>
    );
  }
  return null;
};

const CustomWorkloadTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
        <p className="font-bold text-white text-sm">{data.name}</p>
        <p className="text-slate-300">Assigned: <strong className="text-indigo-400">{data.assigned_workload}h</strong></p>
        <p className="text-slate-300">Capacity: <strong className="text-white">{data.weekly_capacity_hours}h</strong></p>
        <p className="text-slate-300">Available: <strong className="text-emerald-400">{data.available_capacity}h</strong></p>
        <p className="font-bold pt-1 border-t border-slate-800 text-slate-200">
          Utilization: <span className={data.utilization_percent > 100 ? 'text-rose-400' : 'text-cyan-400'}>{data.utilization_percent}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [projectsList, setProjectsList] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async (projId = selectedProjectId) => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, projectsRes] = await Promise.all([
        dashboardAPI.getSummary(projId),
        projectAPI.getProjects().catch(() => ({ data: [] }))
      ]);

      if (summaryRes.success) {
        setDashboardData(summaryRes);
      }
      if (projectsRes.data) {
        setProjectsList(projectsRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedProjectId);
  }, [selectedProjectId]);

  const metrics = dashboardData?.metrics || {
    total_projects: 0,
    total_tasks: 0,
    total_members: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    blocked_tasks: 0,
    to_do_tasks: 0,
    overdue_tasks: 0,
    active_blockers: 0,
    escalated_blockers: 0,
    total_open_blockers: 0
  };

  const projectProgress = dashboardData?.project_progress || [];
  const teamWorkload = dashboardData?.team_workload || [];
  const upcomingDeadlines = dashboardData?.upcoming_deadlines || [];
  const recentActivities = dashboardData?.recent_activities || [];
  const openBlockers = dashboardData?.recent_blockers || [];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>TaskPilot Mission Control</span>
            </span>
            <span className="text-xs text-slate-400">Live Executive Overview</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
            Welcome back, {user?.name || 'Commander'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Real-time project telemetry, workload balancing, blocker alerts, and team decision stream.
          </p>
        </div>

        {/* Filter by Project & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 pr-9 text-xs font-semibold text-white shadow-lg outline-none hover:border-slate-600 focus:border-indigo-500 transition"
            >
              <option value="all">⚡ All Projects (Global Scope)</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▼
            </div>
          </div>

          <button
            onClick={() => fetchDashboard(selectedProjectId)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards (Core KPIs) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects */}
        <Link
          to="/projects"
          className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-indigo-500/50 transition shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Projects</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.total_projects}</span>
            <span className="text-[11px] font-medium text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
              View All <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Active development workspaces</p>
        </Link>

        {/* Total Tasks */}
        <Link
          to="/tasks"
          className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-cyan-500/50 transition shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Tasks</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.total_tasks}</span>
            <span className="text-[11px] font-medium text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
              Task Board <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {metrics.completed_tasks} completed &bull; {metrics.in_progress_tasks} in progress
          </p>
        </Link>

        {/* Team Members */}
        <Link
          to="/team"
          className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-emerald-500/50 transition shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Team Engineers</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.total_members}</span>
            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
              Manage <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Capacity & skill allocations</p>
        </Link>

        {/* Open Blockers */}
        <Link
          to="/blockers"
          className={`group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition shadow-lg ${
            metrics.total_open_blockers > 0
              ? 'border-rose-500/40 bg-rose-950/20 hover:border-rose-500/70'
              : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Open Blockers</span>
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center group-hover:scale-110 transition ${
                metrics.escalated_blockers > 0
                  ? 'bg-rose-600/20 border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-amber-600/10 border-amber-500/20 text-amber-400'
              }`}
            >
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.total_open_blockers}</span>
            <span className="text-[11px] font-medium text-rose-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
              Blocker Center <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {metrics.escalated_blockers} escalated &bull; {metrics.active_blockers} active
          </p>
        </Link>
      </div>

      {/* Task Status Breakdown Secondary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-400 block">Completed</span>
            <span className="text-xl font-bold text-white">{metrics.completed_tasks}</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400/50" />
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-indigo-400 block">In Progress</span>
            <span className="text-xl font-bold text-white">{metrics.in_progress_tasks}</span>
          </div>
          <Activity className="w-6 h-6 text-indigo-400/50" />
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-400 block">Blocked</span>
            <span className="text-xl font-bold text-white">{metrics.blocked_tasks}</span>
          </div>
          <ShieldAlert className="w-6 h-6 text-rose-400/50" />
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-400 block">Overdue Tasks</span>
            <span className="text-xl font-bold text-amber-300">{metrics.overdue_tasks}</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-400/50" />
        </div>
      </div>

      {/* Blocker Alert Banner (if escalated or active blockers exist) */}
      {metrics.total_open_blockers > 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-slate-900/60 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Active Blocker Escalation Alert</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {metrics.total_open_blockers} Issues Impeding Progress
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {metrics.escalated_blockers > 0
                  ? `Critical: ${metrics.escalated_blockers} blocker(s) have passed the 48h SLA and require immediate intervention.`
                  : `${metrics.active_blockers} blocker(s) reported by team members currently awaiting resolution.`}
              </p>
            </div>
          </div>

          <Link
            to="/blockers"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-950 transition shrink-0"
          >
            <span>Open Blocker Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Visualizations Grid: Recharts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Project Progress Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Project Progress (% Complete)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Completion percentage based on resolved tasks vs total scope
              </p>
            </div>
            <Link
              to="/projects"
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              All Projects &rarr;
            </Link>
          </div>

          {projectProgress.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              <FolderKanban className="w-8 h-8 mb-2 opacity-30" />
              <span>No project data available</span>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectProgress}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    unit="%"
                    stroke="#334155"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    width={110}
                    stroke="#334155"
                  />
                  <Tooltip content={<CustomProjectTooltip />} />
                  <Bar dataKey="progress_percent" radius={[0, 8, 8, 0]}>
                    {projectProgress.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.progress_percent === 100 ? '#10b981' : entry.progress_percent >= 50 ? '#6366f1' : '#38bdf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Team Workload Balancer Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Team Capacity vs Assigned Workload</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Stage 4 workload balancer telemetry (weekly hours)
              </p>
            </div>
            <Link
              to="/workload"
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
            >
              Workload Balancer &rarr;
            </Link>
          </div>

          {teamWorkload.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <span>No team workload records found</span>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={teamWorkload}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#334155"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    unit="h"
                    stroke="#334155"
                  />
                  <Tooltip content={<CustomWorkloadTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                  <Bar
                    name="Assigned Hours"
                    dataKey="assigned_workload"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name="Weekly Capacity"
                    dataKey="weekly_capacity_hours"
                    fill="#334155"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Bottom Grid: Upcoming Deadlines & Recent Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Upcoming Deadlines (Next 7 Days) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Upcoming Deadlines (Next 7 Days)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Tasks approaching target delivery milestones
              </p>
            </div>
            <Link
              to="/tasks"
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              View All Tasks &rarr;
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30 text-emerald-400" />
              <p className="font-semibold text-slate-400">No urgent deadlines in the next 7 days</p>
              <p className="mt-0.5">All scheduled deliverables are on track or completed.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingDeadlines.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/40 hover:bg-slate-900/80 transition flex items-center justify-between group"
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white group-hover:text-indigo-300 transition truncate">
                        {task.title}
                      </span>
                      {task.project && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-[10px] font-medium text-slate-400 border border-slate-800">
                          {task.project.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Owner: <strong className="text-slate-300">{task.assignee?.name || 'Unassigned'}</strong></span>
                      <span>&bull;</span>
                      <span className="text-amber-300 font-medium">Due {task.due_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        STATUS_BADGES[task.status] || STATUS_BADGES['To Do']
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Activity Stream (Status Changes & Decision Logs) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-cyan-400" />
                <span>Recent Activity & Decision Stream</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Latest task state changes, architectural decisions, and handoffs
              </p>
            </div>
            <Link
              to="/handoffs"
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
            >
              Handoffs Hub &rarr;
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              <Activity className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-400">No recent activity recorded yet</p>
              <p className="mt-0.5">Task assignments, status changes, and decision logs will show up here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          DECISION_BADGES[act.decision_type] || DECISION_BADGES.general_decision || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {act.decision_type?.replace(/_/g, ' ') || 'Action'}
                      </span>

                      {act.project_name && (
                        <span className="text-[10px] text-indigo-400 font-medium">
                          {act.project_name}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-100 leading-snug">
                    {act.summary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span>By: <strong className="text-slate-200">{act.actor_name}</strong></span>
                      {act.next_owner_name && (
                        <span>&rarr; Assigned to: <strong className="text-white">{act.next_owner_name}</strong></span>
                      )}
                    </div>

                    <Link
                      to={`/tasks/${act.task_id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold text-[11px] flex items-center gap-0.5"
                    >
                      <span>Task #{act.task_id}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
