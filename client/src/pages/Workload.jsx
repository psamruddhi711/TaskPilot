import React, { useState, useEffect } from 'react';
import { workloadAPI, projectAPI } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  FolderKanban,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md">
        <p className="font-bold text-white mb-1.5">{label}</p>
        <div className="space-y-1 text-slate-300">
          <p className="flex items-center justify-between gap-4">
            <span className="text-indigo-400">Assigned Load:</span>
            <strong>{data.assigned_workload} hrs</strong>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-emerald-400">Available:</span>
            <strong>{data.available_capacity} hrs</strong>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Capacity Limit:</span>
            <strong>{data.weekly_capacity_hours} hrs/wk</strong>
          </p>
          <p className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 font-semibold">
            <span>Utilization:</span>
            <span
              className={
                data.utilization_percentage > 100
                  ? 'text-rose-400 font-bold'
                  : data.utilization_percentage >= 80
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }
            >
              {data.utilization_percentage}%
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const Workload = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [workloadData, setWorkloadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getProjects();
      if (res.success) setProjects(res.data);
    } catch (err) {
      console.warn('Could not load project selector list:', err.message);
    }
  };

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await workloadAPI.getProjectWorkload(selectedProjectId);
      if (res.success) {
        setWorkloadData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load workload metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchWorkload();
  }, [selectedProjectId]);

  const members = workloadData?.members || [];
  const summary = workloadData?.summary || {
    total_members: 0,
    total_capacity: 0,
    total_assigned: 0,
    avg_utilization: 0,
    overallocated_count: 0
  };

  // Prepare chart dataset
  const chartData = members.map((m) => ({
    name: m.name.split(' ')[0], // First name for compact axis
    fullName: m.name,
    assigned_workload: m.assigned_workload,
    available_capacity: m.available_capacity,
    weekly_capacity_hours: m.weekly_capacity_hours,
    utilization_percentage: m.utilization_percentage,
    status: m.status
  }));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Overallocated':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Optimal':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getProgressBarColor = (status) => {
    switch (status) {
      case 'Overallocated':
        return 'bg-rose-500';
      case 'High':
        return 'bg-amber-500';
      case 'Optimal':
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Project Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">Smart Workload Balancer</h2>
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400 border border-indigo-500/20">
              Live Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time capacity tracking, bandwidth allocation, and overload prevention
          </p>
        </div>

        {/* Project Filter Dropdown */}
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-slate-500" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-indigo-500"
          >
            <option value="all">Global Workspace (All Members)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assigned Workload */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Workload</span>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">{summary.total_assigned} hrs</p>
          <p className="mt-1 text-[11px] text-slate-500">Total estimated effort across active tasks</p>
        </div>

        {/* Total Team Capacity */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Bandwidth</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">{summary.total_capacity} hrs/wk</p>
          <p className="mt-1 text-[11px] text-slate-500">Across {summary.total_members} team members</p>
        </div>

        {/* Average Utilization */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Utilization</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">{summary.avg_utilization}%</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary.avg_utilization <= 80 ? 'Healthy team bandwidth' : 'High overall utilization'}
          </p>
        </div>

        {/* Overallocated Members */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overload Alerts</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                summary.overallocated_count > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'
              }`}
            />
          </div>
          <p
            className={`mt-3 text-2xl font-extrabold ${
              summary.overallocated_count > 0 ? 'text-rose-400' : 'text-white'
            }`}
          >
            {summary.overallocated_count}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary.overallocated_count === 0
              ? 'No team members over capacity'
              : 'Members exceeding 100% capacity'}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Recharts Workload Bar Chart Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <span>Assigned Workload vs Available Capacity</span>
            </h3>
            <p className="text-xs text-slate-400">
              Comparing active allocated hours against individual weekly limits
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="h-3 w-3 rounded-sm bg-indigo-500" /> Assigned Hours
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-3 w-3 rounded-sm bg-emerald-500/60" /> Available Capacity
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-slate-950/60 flex items-center justify-center text-xs text-slate-500">
            Computing workload analytics...
          </div>
        ) : members.length === 0 ? (
          <div className="h-64 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs">
            No team members found for this workspace.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="assigned_workload" name="Assigned Workload" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available_capacity" name="Available Capacity" fill="#10b981" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Individual Member Workload Cards & Tasks Breakdown */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Member Bandwidth Breakdown</h3>
          <p className="text-xs text-slate-400">
            Granular inspection of individual member allocation, utilization progress, and active tasks
          </p>
        </div>

        {members.length === 0 ? null : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {members.map((member) => {
              const badgeClass = getStatusBadge(member.status);
              const barColor = getProgressBarColor(member.status);

              return (
                <div
                  key={member.user_id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4"
                >
                  {/* Top Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="truncate text-sm font-bold text-white">{member.name}</p>
                        <p className="truncate text-xs text-slate-400">{member.email}</p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {member.project_role || member.role}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shrink-0 ${badgeClass}`}
                    >
                      {member.status}
                    </span>
                  </div>

                  {/* Progress Bar & Stats */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        {member.assigned_workload}h / {member.weekly_capacity_hours}h capacity
                      </span>
                      <strong className="text-white font-bold">{member.utilization_percentage}%</strong>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, member.utilization_percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Tasks List */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Active Tasks ({member.active_tasks_count})
                    </p>
                    {member.active_tasks.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No active tasks assigned.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {member.active_tasks.map((task) => (
                          <Link
                            key={task.id}
                            to={`/tasks/${task.id}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition text-xs"
                          >
                            <span className="truncate font-medium text-slate-200">{task.title}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] text-indigo-400 font-semibold">
                                {task.estimated_hours}h
                              </span>
                              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-400">
                                {task.status}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
