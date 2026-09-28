import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetAPI } from '../services/api';
import { TimesheetReviewModal } from '../components/TimesheetReviewModal';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  User,
  AlertTriangle,
  FolderKanban,
  FileSpreadsheet,
  CheckSquare,
  Sparkles
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_BADGES = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#25292E] dark:text-[#A1A1AA] dark:border-[#30343A]',
  Submitted: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  Rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
};

export const TimesheetApprovals = () => {
  const { user } = useAuth();
  const today = new Date();

  const [timesheets, setTimesheets] = useState([]);
  const [metrics, setMetrics] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    draft_count: 0,
    total_hours_pending: 0,
    total_hours_approved: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Review Modal State
  const [selectedTimesheetId, setSelectedTimesheetId] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth && selectedMonth !== 'All') params.month = selectedMonth;
      if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;

      const res = await timesheetAPI.getApprovals(params);
      setTimesheets(res.data?.timesheets || []);
      setMetrics(res.data?.metrics || {
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        draft_count: 0,
        total_hours_pending: 0,
        total_hours_approved: 0
      });
    } catch (err) {
      console.error('Failed to load timesheet approvals:', err);
      setError(err.message || 'Failed to retrieve timesheet approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [selectedYear, selectedMonth, selectedStatus]);

  const handleOpenReview = (id) => {
    setSelectedTimesheetId(id);
    setIsReviewModalOpen(true);
  };

  const handleDownloadExcel = async (id, name, year, month) => {
    try {
      await timesheetAPI.downloadExcel({ timesheetId: id });
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Failed to download Excel timesheet report.');
    }
  };

  // Client search filtering
  const filteredTimesheets = timesheets.filter((t) => {
    const matchesSearch =
      t.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.projects_involved?.some((p) => p.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Page Title Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#202124] dark:text-[#F3F4F6]">
              Timesheet Approvals
            </h1>
            <span className="rounded border px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50">
              Manager Center
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            Review, audit, approve, or reject monthly timesheets submitted by assigned team members.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Review */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.pending_count}
            </span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              {metrics.total_hours_pending} hrs pending
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Awaiting manager sign-off
          </p>
        </div>

        {/* Approved Timesheets */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Approved Timesheets</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.approved_count}
            </span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              {metrics.total_hours_approved} hrs logged
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Locked and verified for reports
          </p>
        </div>

        {/* Returned / Rejected */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Returned for Revision</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {metrics.rejected_count}
            </span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              Revisions pending
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Feedback provided to employee
          </p>
        </div>

        {/* Total Managed Timesheets */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Total Tracked</span>
            <ClipboardCheck className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">
              {timesheets.length}
            </span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              {metrics.draft_count} in draft
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Across assigned projects
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1C1F23] p-3.5 rounded-lg border border-[#E5E7EB] dark:border-[#30343A] shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
          <input
            type="text"
            placeholder="Search by employee name or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] py-1.5 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8]"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted (Pending Review)</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none"
          >
            <option value="All">All Months</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#111315] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] text-[#6B7280] dark:text-[#A1A1AA]">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Period</th>
                <th className="py-3 px-4 font-semibold">Total Hours</th>
                <th className="py-3 px-4 font-semibold">Projects Logged</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Submission Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#30343A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9CA3AF] dark:text-[#71717A]">
                    Loading timesheets for approval...
                  </td>
                </tr>
              ) : filteredTimesheets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9CA3AF] dark:text-[#71717A]">
                    No timesheets found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTimesheets.map((ts) => (
                  <tr key={ts.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#25292E] transition">
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8]">
                          {ts.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-[#202124] dark:text-[#F3F4F6] block">
                            {ts.employee_name}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                            {ts.employee_role} &bull; {ts.employee_email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-[#202124] dark:text-[#F3F4F6]">
                      {ts.month_name} {ts.year}
                    </td>

                    {/* Total Hours */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-sm text-[#4F46E5] dark:text-[#818CF8] block">
                        {ts.total_hours} hrs
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                        {ts.entries_count} entries
                      </span>
                    </td>

                    {/* Projects Involved */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {ts.projects_involved && ts.projects_involved.length > 0 ? (
                          ts.projects_involved.map((pName) => (
                            <span
                              key={pName}
                              className="px-1.5 py-0.2 rounded bg-[#F1F3F5] dark:bg-[#181A1D] text-[10px] text-[#4B5563] dark:text-[#D1D5DB] border border-[#E5E7EB] dark:border-[#30343A]"
                            >
                              {pName}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">General</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_BADGES[ts.status] || STATUS_BADGES.Draft
                        }`}
                      >
                        {ts.status}
                      </span>
                    </td>

                    {/* Submission Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7280] dark:text-[#A1A1AA] text-[11px]">
                      {ts.submitted_at ? (
                        <div>
                          <span>{new Date(ts.submitted_at).toLocaleDateString()}</span>
                          {ts.reviewer_name && (
                            <span className="block text-[9px] text-[#9CA3AF] dark:text-[#71717A]">
                              By {ts.reviewer_name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF] dark:text-[#71717A] italic">Unsubmitted</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReview(ts.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                            ts.status === 'Submitted'
                              ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-xs'
                              : 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] hover:bg-gray-200 dark:hover:bg-[#30343A]'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{ts.status === 'Submitted' ? 'Review & Sign' : 'Inspect'}</span>
                        </button>

                        <button
                          onClick={() => handleDownloadExcel(ts.id, ts.employee_name, ts.year, ts.month)}
                          className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white transition"
                          title="Export to Excel"
                        >
                          <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Approval Modal */}
      <TimesheetReviewModal
        isOpen={isReviewModalOpen}
        timesheetId={selectedTimesheetId}
        onClose={() => setIsReviewModalOpen(false)}
        onActionComplete={fetchApprovals}
      />
    </div>
  );
};

export default TimesheetApprovals;
