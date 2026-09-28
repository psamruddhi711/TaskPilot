import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetAPI } from '../services/api';
import { WorkLogModal } from '../components/WorkLogModal';
import {
  Clock,
  Calendar,
  Plus,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  History,
  FileSpreadsheet,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  Lock,
  Layers,
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

const CATEGORY_COLORS = {
  Development: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40',
  Testing: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  'Bug Fixing': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  Meeting: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  Documentation: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
  Research: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  'Code Review': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
  Other: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#25292E] dark:text-[#A1A1AA] dark:border-[#30343A]'
};

export const Timesheet = () => {
  const { user } = useAuth();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submittingTimesheet, setSubmittingTimesheet] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // View switch: 'table' or 'byDay'
  const [viewMode, setViewMode] = useState('table');

  const fetchTimesheet = async (yr = selectedYear, mo = selectedMonth) => {
    try {
      setLoading(true);
      setError('');
      const res = await timesheetAPI.getMyTimesheet(yr, mo);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load timesheet:', err);
      setError(err.message || 'Failed to retrieve monthly timesheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheet(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Navigate Months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
  };

  // Open Log Modal for new entry
  const handleNewLog = () => {
    setEditingEntry(null);
    setIsLogModalOpen(true);
  };

  // Open Log Modal for editing
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setIsLogModalOpen(true);
  };

  // Delete an entry
  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this work log entry?')) return;
    try {
      await timesheetAPI.deleteEntry(id);
      setSuccessMsg('Work log entry deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchTimesheet(selectedYear, selectedMonth);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete work log entry.');
    }
  };

  // Submit Timesheet
  const handleSubmitTimesheet = async (e) => {
    e.preventDefault();
    try {
      setSubmittingTimesheet(true);
      setError('');
      await timesheetAPI.submitTimesheet({
        year: selectedYear,
        month: selectedMonth,
        submission_notes: submissionNotes
      });
      setIsSubmitModalOpen(false);
      setSubmissionNotes('');
      setSuccessMsg(`Timesheet for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} submitted to manager for approval.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchTimesheet(selectedYear, selectedMonth);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit timesheet.');
    } finally {
      setSubmittingTimesheet(false);
    }
  };

  // Download Excel Report
  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      await timesheetAPI.downloadExcel({
        year: selectedYear,
        month: selectedMonth
      });
    } catch (err) {
      console.error('Excel export error:', err);
      setError(err.message || 'Failed to download Excel timesheet.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const timesheet = data?.timesheet;
  const entries = data?.entries || [];
  const summary = data?.summary || {
    total_hours: 0,
    working_days_logged: 0,
    total_working_days_in_month: 22,
    expected_monthly_hours: 160,
    progress_percent: 0,
    category_breakdown: {},
    project_breakdown: {}
  };
  const auditLogs = data?.auditLogs || [];

  const isEditable = timesheet?.status === 'Draft' || timesheet?.status === 'Rejected';
  const canSubmit = isEditable && entries.length > 0 && summary.total_hours > 0;

  // Group entries by date for accordion/day view
  const entriesByDate = {};
  entries.forEach((entry) => {
    if (!entriesByDate[entry.work_date]) {
      entriesByDate[entry.work_date] = [];
    }
    entriesByDate[entry.work_date].push(entry);
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Month Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#202124] dark:text-[#F3F4F6]">
              Timesheet Management
            </h1>
            {timesheet && (
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                  STATUS_BADGES[timesheet.status] || STATUS_BADGES.Draft
                }`}
              >
                {timesheet.status}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            Log daily work hours, monitor monthly target completion, and submit for manager sign-off.
          </p>
        </div>

        {/* Month Navigator & Fast Jumps */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-0.5 shadow-xs">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] min-w-[120px] text-center">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleCurrentMonth}
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-2.5 py-1.5 text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:bg-gray-50 dark:hover:bg-[#25292E] transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Rejection Alert Banner */}
      {timesheet?.status === 'Rejected' && (
        <div className="rounded-lg border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-rose-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-900 dark:text-rose-200 font-semibold text-xs">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-rose-400" />
            <span>Timesheet Returned for Revision</span>
          </div>
          <p className="text-xs text-red-800 dark:text-rose-200 bg-white/60 dark:bg-[#1C1F23]/60 p-2.5 rounded border border-red-200 dark:border-red-800/30">
            <strong>Manager Feedback:</strong> {timesheet.rejection_reason || 'Please review your logged hours and details.'}
          </p>
          <p className="text-[11px] text-red-700 dark:text-rose-300">
            You can make corrections to existing entries or log missing hours below, then click <strong>Submit Monthly Timesheet</strong> to resubmit.
          </p>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Hours Logged */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Logged This Month</span>
            <Clock className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{summary.total_hours} <span className="text-xs font-normal text-[#6B7280] dark:text-[#A1A1AA]">hrs</span></span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              Target: {summary.expected_monthly_hours}h
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-2 w-full bg-[#F1F3F5] dark:bg-[#25292E] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                summary.progress_percent >= 100
                  ? 'bg-emerald-500'
                  : summary.progress_percent >= 50
                  ? 'bg-[#4F46E5] dark:bg-[#818CF8]'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, summary.progress_percent)}%` }}
            />
          </div>
        </div>

        {/* Working Days Logged */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Active Working Days</span>
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{summary.working_days_logged} <span className="text-xs font-normal text-[#6B7280] dark:text-[#A1A1AA]">days</span></span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              of {summary.total_working_days_in_month} working days
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Daily average: {summary.working_days_logged > 0 ? (summary.total_hours / summary.working_days_logged).toFixed(1) : 0} hrs/day
          </p>
        </div>

        {/* Target Completion Rate */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Monthly Completion</span>
            <TrendingUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">{summary.progress_percent}%</span>
            <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
              {summary.progress_percent >= 100 ? 'Goal Reached' : 'In Progress'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Capacity: {user?.weekly_capacity_hours || 40} hrs/week
          </p>
        </div>

        {/* Current Approval Status */}
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="text-xs font-medium">Approval Status</span>
            {timesheet?.status === 'Approved' ? (
              <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
            )}
          </div>
          <div className="mt-2">
            <span
              className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${
                STATUS_BADGES[timesheet?.status] || STATUS_BADGES.Draft
              }`}
            >
              {timesheet?.status || 'Draft'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            {timesheet?.status === 'Approved'
              ? 'Locked from modifications'
              : timesheet?.status === 'Submitted'
              ? 'Pending manager review'
              : 'Editable draft'}
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1C1F23] p-4 rounded-lg border border-[#E5E7EB] dark:border-[#30343A] shadow-xs">
        <div className="flex items-center gap-2">
          {/* Create Entry Button */}
          {isEditable ? (
            <button
              onClick={handleNewLog}
              className="flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Daily Work</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5] dark:bg-[#25292E] px-3 py-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A]">
              <Lock className="h-3.5 w-3.5" />
              <span>Timesheet is {timesheet?.status} (Read-Only)</span>
            </div>
          )}

          {/* Submit Monthly Timesheet Button */}
          {isEditable && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 rounded-md border border-[#4F46E5] dark:border-[#818CF8] bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canSubmit ? 'Log work hours before submitting' : 'Submit timesheet to project manager'}
            >
              <Send className="h-3.5 w-3.5" />
              <span>{timesheet?.status === 'Rejected' ? 'Resubmit Timesheet' : 'Submit for Approval'}</span>
            </button>
          )}
        </div>

        {/* View Mode & Excel Export */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#111315] p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#A1A1AA]'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('byDay')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                viewMode === 'byDay'
                  ? 'bg-white dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#A1A1AA]'
              }`}
            >
              Day by Day
            </button>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel || entries.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] px-3 py-1.5 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] transition disabled:opacity-50"
            title="Download formatted Excel (.xlsx) file"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadingExcel ? 'Exporting...' : 'Download Excel'}</span>
          </button>
        </div>
      </div>

      {/* Main Timesheet Records Content */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#9CA3AF] dark:text-[#71717A] bg-white dark:bg-[#1C1F23] rounded-lg border border-[#E5E7EB] dark:border-[#30343A]">
          Loading timesheet entries for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-12 text-center space-y-3">
          <Clock className="w-8 h-8 text-[#9CA3AF] dark:text-[#71717A] mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">
            No work logs recorded for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] max-w-sm mx-auto">
            Get started by logging daily work completed against your assigned projects and tasks.
          </p>
          {isEditable && (
            <button
              onClick={handleNewLog}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record First Work Log</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Full Monthly Table View */
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] text-[#6B7280] dark:text-[#A1A1AA]">
                  <th className="py-3 px-4 font-semibold">Date & Day</th>
                  <th className="py-3 px-4 font-semibold">Project & Task</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Time / Hours</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {isEditable && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#30343A]">
                {entries.map((entry) => {
                  const dateObj = new Date(entry.work_date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <tr key={entry.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#25292E] transition">
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-[#202124] dark:text-[#F3F4F6] block">{entry.work_date}</span>
                        <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">{dayName}</span>
                      </td>

                      {/* Project & Task */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#202124] dark:text-[#F3F4F6] block">
                          {entry.project?.name || 'Project'}
                        </span>
                        {entry.task ? (
                          <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                            Task #{entry.task.id}: {entry.task.title}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] italic">General Project Activity</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                            CATEGORY_COLORS[entry.work_category] || CATEGORY_COLORS.Other
                          }`}
                        >
                          {entry.work_category}
                        </span>
                      </td>

                      {/* Time Window & Hours */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-xs text-[#4F46E5] dark:text-[#818CF8] block">
                          {entry.hours_worked} hrs
                        </span>
                        {entry.start_time && entry.end_time ? (
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                            {entry.start_time} - {entry.end_time} ({entry.break_minutes}m break)
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">Direct Hours</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-sm text-[#4B5563] dark:text-[#D1D5DB]">
                        <p className="line-clamp-2">{entry.work_description}</p>
                        {entry.remarks && (
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] italic block mt-0.5">
                            Note: {entry.remarks}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`rounded border px-1.5 py-0.2 text-[10px] font-medium ${
                            STATUS_BADGES[entry.status] || STATUS_BADGES.Draft
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>

                      {/* Actions */}
                      {isEditable && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white transition"
                              title="Edit Log"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-rose-950/40 hover:text-red-600 dark:hover:text-rose-400 transition"
                              title="Delete Log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Total Hours */}
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] font-bold text-xs">
                  <td colSpan={3} className="py-3 px-4 text-right text-[#202124] dark:text-[#F3F4F6]">
                    TOTAL MONTHLY HOURS:
                  </td>
                  <td className="py-3 px-4 text-[#4F46E5] dark:text-[#818CF8] text-sm font-bold">
                    {summary.total_hours} hrs
                  </td>
                  <td colSpan={isEditable ? 3 : 2} className="py-3 px-4 text-[#6B7280] dark:text-[#A1A1AA] text-[11px]">
                    {entries.length} work logs across {summary.working_days_logged} days
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Day by Day Grouped View */
        <div className="space-y-4">
          {Object.entries(entriesByDate).map(([date, dayEntries]) => {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const dayTotal = dayEntries.reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0);

            return (
              <div
                key={date}
                className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] overflow-hidden shadow-xs"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between bg-[#F9FAFB] dark:bg-[#181A1D] px-4 py-2.5 border-b border-[#E5E7EB] dark:border-[#30343A]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                    <span className="font-bold text-xs text-[#202124] dark:text-[#F3F4F6]">{date}</span>
                    <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">({dayName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8]">
                      Day Total: {dayTotal.toFixed(1)} hrs
                    </span>
                  </div>
                </div>

                {/* Day Entries List */}
                <div className="divide-y divide-[#E5E7EB] dark:divide-[#30343A] p-2">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="p-2.5 flex items-start justify-between gap-3 text-xs hover:bg-[#F9FAFB] dark:hover:bg-[#25292E] rounded transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#202124] dark:text-[#F3F4F6]">{entry.project?.name}</span>
                          {entry.task && (
                            <span className="text-[#6B7280] dark:text-[#A1A1AA]">
                              &bull; Task #{entry.task.id}: {entry.task.title}
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-medium border ${
                              CATEGORY_COLORS[entry.work_category] || CATEGORY_COLORS.Other
                            }`}
                          >
                            {entry.work_category}
                          </span>
                        </div>
                        <p className="text-[#4B5563] dark:text-[#D1D5DB] text-[11px]">{entry.work_description}</p>
                        {entry.remarks && (
                          <p className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] italic">Note: {entry.remarks}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-[#4F46E5] dark:text-[#818CF8] text-xs block">{entry.hours_worked}h</span>
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">{entry.start_time || 'Direct'}</span>
                        </div>

                        {isEditable && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-white"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission & Approval Audit History Accordion */}
      {auditLogs.length > 0 && (
        <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
            <History className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>Submission & Review History</span>
          </h3>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md bg-[#F9FAFB] dark:bg-[#181A1D] px-3.5 py-2 text-xs border border-[#E5E7EB] dark:border-[#30343A]"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                      log.action === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : log.action === 'REJECTED'
                        ? 'bg-red-100 text-red-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-indigo-100 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-[#818CF8]'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-[#202124] dark:text-[#F3F4F6]">
                    <strong>{log.actor?.name || 'System'}</strong>: {log.comments || 'No comment recorded'}
                  </span>
                </div>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Log Modal */}
      <WorkLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={() => fetchTimesheet(selectedYear, selectedMonth)}
        editingEntry={editingEntry}
        defaultDate={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
      />

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-3">
              <h3 className="text-sm font-bold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
                <Send className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>Submit Timesheet for Manager Review</span>
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
              <p>
                You are submitting your timesheet for <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> with a total of <strong>{summary.total_hours} logged hours</strong>.
              </p>
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 text-[11px]">
                Once submitted, this timesheet will become read-only until your project manager reviews and acts upon it.
              </div>

              <div>
                <label className="block font-medium mb-1 text-[#202124] dark:text-[#F3F4F6]">
                  Optional Note to Project Manager:
                </label>
                <textarea
                  rows={2}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Completed sprint milestones and security patches..."
                  className="w-full rounded border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] p-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#30343A]">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="rounded border border-[#E5E7EB] dark:border-[#30343A] px-3 py-1.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] hover:bg-gray-50 dark:hover:bg-[#25292E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTimesheet}
                disabled={submittingTimesheet}
                className="rounded bg-[#4F46E5] hover:bg-[#4338CA] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
              >
                {submittingTimesheet ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
