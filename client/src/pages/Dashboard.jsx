import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  ArrowRight,
  TrendingUp,
  Activity,
  GitPullRequest,
  Calendar,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

const PRIORITY_BADGES = {
  Low: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  Medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  High: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  Critical: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
};

const STATUS_BADGES = {
  'To Do': 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  'In Progress': 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  Blocked: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60',
  'In Review': 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
  Completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
};

const DECISION_BADGES = {
  requirement_change: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
  architectural_decision: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  priority_rescoping: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  reassignment: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
  skill_based_assignment: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
  deadline_change: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
  blocker_resolution: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  task_blocked: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60',
  status_change: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
};

// Custom Tooltip with clean neutral styling
const CustomProjectTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-2.5 shadow-md text-xs space-y-1">
        <p className="font-semibold text-[#202124] dark:text-[#F3F4F6]">{data.name}</p>
        <p className="text-emerald-600 dark:text-emerald-400 font-medium">Completion: {data.progress_percent}%</p>
        <p className="text-[#6B7280] dark:text-[#A1A1AA]">Tasks: {data.completed_tasks} / {data.total_tasks} completed</p>
      </div>
    );
  }
  return null;
};

const CustomWorkloadTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-2.5 shadow-md text-xs space-y-1">
        <p className="font-semibold text-[#202124] dark:text-[#F3F4F6]">{data.name}</p>
        <p className="text-[#6B7280] dark:text-[#A1A1AA]">Assigned: <strong className="text-indigo-600 dark:text-indigo-400">{data.assigned_workload}h</strong></p>
        <p className="text-[#6B7280] dark:text-[#A1A1AA]">Capacity: <strong className="text-[#202124] dark:text-[#F3F4F6]">{data.weekly_capacity_hours}h</strong></p>
        <p className="text-[#6B7280] dark:text-[#A1A1AA]">Available: <strong className="text-emerald-600 dark:text-emerald-400">{data.available_capacity}h</strong></p>
        <p className="font-medium pt-1 border-t border-[#E5E7EB] dark:border-[#30343A] text-[#6B7280] dark:text-[#A1A1AA]">
          Utilization: <span className={data.utilization_percent > 100 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-[#202124] dark:text-[#F3F4F6]'}>{data.utilization_percent}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [projectsList, setProjectsList] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#30343A' : '#E5E7EB';
  const axisTextColor = isDark ? '#A1A1AA' : '#6B7280';
  const axisLineColor = isDark ? '#30343A' : '#E5E7EB';

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

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202124] dark:text-[#F3F4F6]">
            Dashboard
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            Operational metrics, team capacity, and project delivery telemetry.
          </p>
        </div>

        {/* Project Selector & Refresh */}
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">All Projects</option>
            {projectsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchDashboard(selectedProjectId)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-2.5 py-1.5 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects */}
        <Link
          to="/projects"
          className="group rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 hover:border-[#D1D5DB] dark:hover:border-[#4B5563] transition shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">Total Projects</span>
            <FolderKanban className="h-4 w-4 text-[#9CA3AF] dark:text-[#71717A] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{metrics.total_projects}</span>
            <span className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] group-hover:underline">
              View &rarr;
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Active workspaces</p>
        </Link>

        {/* Total Tasks */}
        <Link
          to="/tasks"
          className="group rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 hover:border-[#D1D5DB] dark:hover:border-[#4B5563] transition shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">Total Tasks</span>
            <CheckSquare className="h-4 w-4 text-[#9CA3AF] dark:text-[#71717A] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{metrics.total_tasks}</span>
            <span className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] group-hover:underline">
              Board &rarr;
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
            {metrics.completed_tasks} completed &bull; {metrics.in_progress_tasks} in progress
          </p>
        </Link>

        {/* Team Members */}
        <Link
          to="/team"
          className="group rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 hover:border-[#D1D5DB] dark:hover:border-[#4B5563] transition shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">Team Engineers</span>
            <Users className="h-4 w-4 text-[#9CA3AF] dark:text-[#71717A] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{metrics.total_members}</span>
            <span className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] group-hover:underline">
              Directory &rarr;
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Active capacity limit</p>
        </Link>

        {/* Open Blockers */}
        <Link
          to="/blockers"
          className={`group rounded-lg border p-4 transition shadow-sm ${
            metrics.total_open_blockers > 0
              ? 'border-red-300 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20 hover:border-red-400 dark:hover:border-red-700'
              : 'border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] hover:border-[#D1D5DB] dark:hover:border-[#4B5563]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">Open Blockers</span>
            <AlertOctagon
              className={`h-4 w-4 ${
                metrics.escalated_blockers > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#9CA3AF] dark:text-[#71717A]'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{metrics.total_open_blockers}</span>
            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 group-hover:underline">
              Blocker Center &rarr;
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
            {metrics.escalated_blockers > 0
              ? `${metrics.escalated_blockers} escalated (>48h)`
              : `${metrics.active_blockers} active`}
          </p>
        </Link>
      </div>

      {/* Secondary Status Breakdown Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#25292E] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] block">Completed</span>
            <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">{metrics.completed_tasks}</span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/50" />
        </div>

        <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#25292E] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] block">In Progress</span>
            <span className="text-base font-semibold text-indigo-700 dark:text-indigo-400">{metrics.in_progress_tasks}</span>
          </div>
          <Activity className="w-4 h-4 text-indigo-600/70 dark:text-indigo-400/50" />
        </div>

        <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#25292E] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] block">Blocked</span>
            <span className="text-base font-semibold text-red-700 dark:text-red-400">{metrics.blocked_tasks}</span>
          </div>
          <ShieldAlert className="w-4 h-4 text-red-600/70 dark:text-red-400/50" />
        </div>

        <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#25292E] px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] block">Overdue</span>
            <span className="text-base font-semibold text-amber-700 dark:text-amber-400">{metrics.overdue_tasks}</span>
          </div>
          <AlertTriangle className="w-4 h-4 text-amber-600/70 dark:text-amber-400/50" />
        </div>
      </div>

      {/* Blocker Alert Banner (if escalated or active blockers exist) */}
      {metrics.total_open_blockers > 0 && (
        <div className="rounded-md border border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-red-900 dark:text-[#F3F4F6]">
                {metrics.total_open_blockers} Active Roadblock{metrics.total_open_blockers > 1 ? 's' : ''} Require Attention
              </span>
              <p className="text-[11px] text-red-700 dark:text-[#A1A1AA]">
                {metrics.escalated_blockers > 0
                  ? `${metrics.escalated_blockers} critical blocker(s) have passed the 48h SLA.`
                  : `${metrics.active_blockers} active blocker(s) under review.`}
              </p>
            </div>
          </div>

          <Link
            to="/blockers"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-700/50 rounded transition shrink-0"
          >
            <span>Review Blockers</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Visualizations Grid: Recharts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Chart 1: Project Progress Chart */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
                Project Delivery Progress
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                Task completion percentage across projects
              </p>
            </div>
            <Link
              to="/projects"
              className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline transition"
            >
              All projects &rarr;
            </Link>
          </div>

          {projectProgress.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] dark:border-[#30343A] rounded text-[#9CA3AF] dark:text-[#71717A] text-xs">
              <FolderKanban className="w-6 h-6 mb-1.5 opacity-30" />
              <span>No project records found</span>
            </div>
          ) : (
            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectProgress}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: axisTextColor, fontSize: 10 }}
                    unit="%"
                    stroke={axisLineColor}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: axisTextColor, fontSize: 10 }}
                    width={100}
                    stroke={axisLineColor}
                  />
                  <Tooltip content={<CustomProjectTooltip />} />
                  <Bar dataKey="progress_percent" radius={[0, 4, 4, 0]} barSize={14}>
                    {projectProgress.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.progress_percent === 100 ? (isDark ? '#4ADE80' : '#15803D') : entry.progress_percent >= 50 ? (isDark ? '#818CF8' : '#4F46E5') : (isDark ? '#60A5FA' : '#3B82F6')}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Team Workload Chart */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
                Team Workload vs Capacity
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                Weekly allocated hours compared to capacity limit
              </p>
            </div>
            <Link
              to="/workload"
              className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline transition"
            >
              Balancer &rarr;
            </Link>
          </div>

          {teamWorkload.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] dark:border-[#30343A] rounded text-[#9CA3AF] dark:text-[#71717A] text-xs">
              <Users className="w-6 h-6 mb-1.5 opacity-30" />
              <span>No workload telemetry available</span>
            </div>
          ) : (
            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={teamWorkload}
                  margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: axisTextColor, fontSize: 10 }}
                    stroke={axisLineColor}
                  />
                  <YAxis
                    tick={{ fill: axisTextColor, fontSize: 10 }}
                    unit="h"
                    stroke={axisLineColor}
                  />
                  <Tooltip content={<CustomWorkloadTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                    formatter={(value) => <span className="text-[#6B7280] dark:text-[#A1A1AA]">{value}</span>}
                  />
                  <Bar
                    name="Assigned Load"
                    dataKey="assigned_workload"
                    fill={isDark ? '#818CF8' : '#4F46E5'}
                    radius={[2, 2, 0, 0]}
                    barSize={12}
                  />
                  <Bar
                    name="Capacity Limit"
                    dataKey="weekly_capacity_hours"
                    fill={isDark ? '#30343A' : '#D1D5DB'}
                    radius={[2, 2, 0, 0]}
                    barSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Operational Grids: Upcoming Deadlines & Recent Decisions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Upcoming Deadlines */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
                Upcoming Deadlines (Next 7 Days)
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                Target milestones approaching delivery
              </p>
            </div>
            <Link
              to="/tasks"
              className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline transition"
            >
              All tasks &rarr;
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="rounded border border-dashed border-[#E5E7EB] dark:border-[#30343A] p-6 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
              <Calendar className="w-5 h-5 mx-auto mb-1 opacity-40 text-emerald-600 dark:text-emerald-400" />
              <p className="font-medium text-[#6B7280] dark:text-[#A1A1AA]">No deadlines in the next 7 days</p>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#71717A] mt-0.5">All scheduled tasks are on track.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#30343A]">
              {upcomingDeadlines.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="py-2.5 flex items-center justify-between hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] -mx-2 px-2 rounded transition group"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-[#202124] dark:text-[#F3F4F6] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition truncate">
                        {task.title}
                      </span>
                      {task.project && (
                        <span className="px-1.5 py-0.2 rounded bg-[#F1F3F5] dark:bg-[#181A1D] text-[10px] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                          {task.project.name}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                      <span>{task.assignee?.name || 'Unassigned'}</span> &bull; <span className="text-amber-600 dark:text-amber-400">Due {task.due_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                        PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
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

        {/* Right: Recent Decisions & Activity */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
                Recent Decisions & Activity
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                Audit log of task updates and architectural handoffs
              </p>
            </div>
            <Link
              to="/handoffs"
              className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline transition"
            >
              Handoffs &rarr;
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="rounded border border-dashed border-[#E5E7EB] dark:border-[#30343A] p-6 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
              <Activity className="w-5 h-5 mx-auto mb-1 opacity-30" />
              <p className="font-medium text-[#6B7280] dark:text-[#A1A1AA]">No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5]/60 dark:bg-[#181A1D]/60 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-medium border uppercase tracking-wider ${
                        DECISION_BADGES[act.decision_type] || 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
                      }`}
                    >
                      {act.decision_type?.replace(/_/g, ' ') || 'Action'}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[#202124] dark:text-[#F3F4F6] leading-snug">
                    {act.summary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#A1A1AA] pt-1 border-t border-[#E5E7EB] dark:border-[#30343A]">
                    <span>By: <strong className="text-[#202124] dark:text-[#F3F4F6] font-normal">{act.actor_name}</strong></span>
                    <Link
                      to={`/tasks/${act.task_id}`}
                      className="text-[#4F46E5] dark:text-[#818CF8] hover:underline text-[11px] flex items-center gap-0.5"
                    >
                      <span>Task #{act.task_id}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
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
