import React, { useState, useEffect } from 'react';
import { workloadAPI, projectAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  FolderKanban,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-3 text-xs shadow-lg">
        <p className="font-semibold text-[#202124] dark:text-[#F3F4F6] mb-1.5">{label}</p>
        <div className="space-y-1 text-[#6B7280] dark:text-[#A1A1AA]">
          <p className="flex items-center justify-between gap-4">
            <span className="text-[#4F46E5] dark:text-[#818CF8]">Assigned Load:</span>
            <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{data.assigned_workload} hrs</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-emerald-600 dark:text-emerald-400">Available:</span>
            <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{data.available_capacity} hrs</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-[#6B7280] dark:text-[#A1A1AA]">Capacity Limit:</span>
            <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{data.weekly_capacity_hours} hrs/wk</span>
          </p>
          <p className="flex items-center justify-between gap-4 pt-1 border-t border-[#E5E7EB] dark:border-[#30343A]">
            <span>Utilization:</span>
            <span
              className={
                data.utilization_percentage > 100
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : data.utilization_percentage >= 80
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-emerald-600 dark:text-emerald-400 font-semibold'
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
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [workloadData, setWorkloadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#30343A' : '#E5E7EB';
  const axisTextColor = isDark ? '#A1A1AA' : '#6B7280';

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
    name: m.name.split(' ')[0],
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
        return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50';
      case 'High':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
      case 'Optimal':
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
    }
  };

  const getProgressBarColor = (status) => {
    switch (status) {
      case 'Overallocated':
        return 'bg-red-500';
      case 'High':
        return 'bg-amber-500';
      case 'Optimal':
      default:
        return 'bg-[#4F46E5] dark:bg-[#818CF8]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#202124] dark:text-[#F3F4F6] tracking-tight">Workload & Capacity</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            Real-time capacity tracking, bandwidth allocation, and overload monitoring
          </p>
        </div>

        {/* Project Filter Dropdown */}
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-[#9CA3AF] dark:text-[#71717A]" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded-md px-3 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Assigned Workload */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Active Workload</span>
            <Clock className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <p className="mt-2 text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{summary.total_assigned} <span className="text-xs font-normal text-[#6B7280] dark:text-[#A1A1AA]">hrs</span></p>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Allocated across active tasks</p>
        </div>

        {/* Total Team Capacity */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Total Bandwidth</span>
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{summary.total_capacity} <span className="text-xs font-normal text-[#6B7280] dark:text-[#A1A1AA]">hrs/wk</span></p>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Across {summary.total_members} team members</p>
        </div>

        {/* Average Utilization */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Avg Utilization</span>
            <TrendingUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="mt-2 text-xl font-semibold text-[#202124] dark:text-[#F3F4F6]">{summary.avg_utilization}%</p>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            {summary.avg_utilization <= 80 ? 'Healthy team bandwidth' : 'Elevated team load'}
          </p>
        </div>

        {/* Overallocated Members */}
        <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            <span>Overload Alerts</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                summary.overallocated_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#9CA3AF] dark:text-[#71717A]'
              }`}
            />
          </div>
          <p
            className={`mt-2 text-xl font-semibold ${
              summary.overallocated_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#202124] dark:text-[#F3F4F6]'
            }`}
          >
            {summary.overallocated_count}
          </p>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            {summary.overallocated_count === 0
              ? 'No team members over capacity'
              : 'Members exceeding 100%'}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Recharts Workload Bar Chart Card */}
      <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-5 shadow-sm">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Assigned Workload vs Available Capacity</span>
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              Comparing active allocated hours against individual weekly limits
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#A1A1AA]">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#4F46E5] dark:bg-[#818CF8]" /> Assigned Hours
            </span>
            <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#A1A1AA]">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600/70 dark:bg-emerald-400/70" /> Available Capacity
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-64 rounded-md bg-[#F1F3F5] dark:bg-[#181A1D]/40 flex items-center justify-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
            Computing workload analytics...
          </div>
        ) : members.length === 0 ? (
          <div className="h-64 rounded-md border border-dashed border-[#E5E7EB] dark:border-[#30343A] flex flex-col items-center justify-center text-[#9CA3AF] dark:text-[#71717A] text-xs">
            No team members found for this workspace.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisTextColor} fontSize={11} tickLine={false} />
                <YAxis stroke={axisTextColor} fontSize={11} tickLine={false} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="assigned_workload" name="Assigned Workload" fill={isDark ? '#818CF8' : '#4F46E5'} radius={[3, 3, 0, 0]} />
                <Bar dataKey="available_capacity" name="Available Capacity" fill={isDark ? '#4ADE80' : '#15803D'} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Individual Member Workload Cards */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Member Bandwidth Breakdown</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            Granular inspection of individual member allocation, utilization progress, and active tasks
          </p>
        </div>

        {members.length === 0 ? null : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((member) => {
              const badgeClass = getStatusBadge(member.status);
              const barColor = getProgressBarColor(member.status);

              return (
                <div
                  key={member.user_id}
                  className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg p-4 space-y-3 shadow-sm"
                >
                  {/* Top Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8]">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{member.name}</p>
                        <p className="truncate text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">{member.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium border shrink-0 ${badgeClass}`}
                    >
                      {member.status}
                    </span>
                  </div>

                  {/* Progress Bar & Stats */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7280] dark:text-[#A1A1AA]">
                        {member.assigned_workload}h / {member.weekly_capacity_hours}h
                      </span>
                      <span className="text-[#202124] dark:text-[#F3F4F6] font-medium">{member.utilization_percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#30343A]">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-300`}
                        style={{ width: `${Math.min(100, member.utilization_percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Tasks List */}
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#30343A] space-y-1.5">
                    <p className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
                      Active Tasks ({member.active_tasks_count})
                    </p>
                    {member.active_tasks.length === 0 ? (
                      <p className="text-xs text-[#9CA3AF] dark:text-[#71717A] italic">No active tasks assigned.</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {member.active_tasks.map((task) => (
                          <Link
                            key={task.id}
                            to={`/tasks/${task.id}`}
                            className="flex items-center justify-between p-2 rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] hover:border-[#4F46E5] dark:hover:border-[#818CF8] transition text-xs group"
                          >
                            <span className="truncate text-[#202124] dark:text-[#F3F4F6] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8]">{task.title}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[11px] text-[#4F46E5] dark:text-[#818CF8] font-medium">
                                {task.estimated_hours}h
                              </span>
                              <span className="rounded bg-white dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
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

export default Workload;
