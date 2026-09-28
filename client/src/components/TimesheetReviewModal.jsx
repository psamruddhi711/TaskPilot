import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import {
  X,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
  FileText,
  Building2,
  History,
  ShieldCheck,
  FolderKanban
} from 'lucide-react';

const STATUS_BADGES = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#25292E] dark:text-[#A1A1AA] dark:border-[#30343A]',
  Submitted: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  Rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
};

export const TimesheetReviewModal = ({
  isOpen,
  timesheetId,
  onClose,
  onActionComplete
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Approval/Rejection Inputs
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    if (isOpen && timesheetId) {
      loadTimesheetDetails(timesheetId);
      setShowRejectForm(false);
      setRejectionReason('');
      setApprovalComments('');
      setActionError('');
    }
  }, [isOpen, timesheetId]);

  const loadTimesheetDetails = async (id) => {
    try {
      setLoading(true);
      setError('');
      const res = await timesheetAPI.getTimesheet(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load timesheet details:', err);
      setError(err.message || 'Failed to retrieve timesheet details.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      setActionError('');
      await timesheetAPI.approveTimesheet(timesheetId, approvalComments);
      onActionComplete();
      onClose();
    } catch (err) {
      console.error('Approval failed:', err);
      setActionError(err.message || 'Failed to approve timesheet.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('Please specify the mandatory reason for rejection.');
      return;
    }

    try {
      setProcessing(true);
      setActionError('');
      await timesheetAPI.rejectTimesheet(timesheetId, rejectionReason);
      onActionComplete();
      onClose();
    } catch (err) {
      console.error('Rejection failed:', err);
      setActionError(err.message || 'Failed to reject timesheet.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      await timesheetAPI.downloadExcel({ timesheetId });
    } catch (err) {
      console.error('Download error:', err);
      setActionError('Failed to download Excel report.');
    }
  };

  if (!isOpen) return null;

  const timesheet = data?.timesheet;
  const entries = timesheet?.entries || [];
  const auditLogs = timesheet?.auditLogs || [];
  const employee = timesheet?.employee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-2xl transition-colors my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#202124] dark:text-[#F3F4F6]">
                  Review Monthly Timesheet
                </h2>
                {timesheet && (
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_BADGES[timesheet.status] || STATUS_BADGES.Draft
                    }`}
                  >
                    {timesheet.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                {employee?.name} &bull; {timesheet?.month_name} {timesheet?.year} &bull; Total: <strong>{timesheet?.total_hours} hrs</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#25292E] px-2.5 py-1 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] hover:border-gray-300 dark:hover:border-[#474D56] transition"
              title="Download Excel Report"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
              Loading timesheet breakdown...
            </div>
          ) : !timesheet ? null : (
            <>
              {/* Employee & Submission Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] p-3">
                  <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Employee</span>
                  <p className="font-semibold text-xs text-[#202124] dark:text-[#F3F4F6] mt-0.5">{employee?.name}</p>
                  <p className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">{employee?.role}</p>
                </div>

                <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] p-3">
                  <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Reported Hours</span>
                  <p className="font-bold text-sm text-[#4F46E5] dark:text-[#818CF8] mt-0.5">{timesheet.total_hours} hrs</p>
                  <p className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                    Capacity: {employee?.weekly_capacity_hours || 40}h/wk
                  </p>
                </div>

                <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] p-3">
                  <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Logged Days</span>
                  <p className="font-semibold text-xs text-[#202124] dark:text-[#F3F4F6] mt-0.5">{data.working_days_count} days</p>
                  <p className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                    Month Working Days: {data.total_working_days_in_month}
                  </p>
                </div>

                <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] p-3">
                  <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Submission Date</span>
                  <p className="font-semibold text-xs text-[#202124] dark:text-[#F3F4F6] mt-0.5">
                    {timesheet.submitted_at ? new Date(timesheet.submitted_at).toLocaleDateString() : 'Draft Mode'}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                    {timesheet.reviewer ? `Reviewed by ${timesheet.reviewer.name}` : 'Awaiting action'}
                  </p>
                </div>
              </div>

              {/* Submission Notes / Rejection Reason Banners */}
              {timesheet.submission_notes && (
                <div className="rounded-md border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-xs">
                  <span className="font-semibold text-[#4F46E5] dark:text-[#818CF8]">Employee Submission Note:</span>
                  <p className="mt-0.5 text-[#202124] dark:text-[#F3F4F6]">{timesheet.submission_notes}</p>
                </div>
              )}

              {timesheet.rejection_reason && (
                <div className="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3 text-xs">
                  <span className="font-semibold text-red-700 dark:text-red-300">Previous Rejection Feedback:</span>
                  <p className="mt-0.5 text-red-800 dark:text-red-200">{timesheet.rejection_reason}</p>
                </div>
              )}

              {/* Detailed Itemized Work Logs Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-[#202124] dark:text-[#F3F4F6]">
                    Itemized Daily Work Logs ({entries.length} entries)
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-md border border-[#E5E7EB] dark:border-[#30343A]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#181A1D] text-[#6B7280] dark:text-[#A1A1AA]">
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                        <th className="py-2.5 px-3 font-semibold">Project & Task</th>
                        <th className="py-2.5 px-3 font-semibold">Category</th>
                        <th className="py-2.5 px-3 font-semibold">Time Window</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Hours</th>
                        <th className="py-2.5 px-3 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#30343A] bg-white dark:bg-[#1C1F23]">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#25292E] transition">
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-[#202124] dark:text-[#F3F4F6]">
                            {entry.work_date}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-[#202124] dark:text-[#F3F4F6] block">
                              {entry.project?.name || 'General Project'}
                            </span>
                            {entry.task && (
                              <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA]">
                                Task #{entry.task.id}: {entry.task.title}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-[#F1F3F5] dark:bg-[#25292E] text-[10px] font-medium text-[#4B5563] dark:text-[#D1D5DB] border border-[#E5E7EB] dark:border-[#30343A]">
                              {entry.work_category}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-[#6B7280] dark:text-[#A1A1AA]">
                            {entry.start_time && entry.end_time
                              ? `${entry.start_time} - ${entry.end_time}`
                              : 'Direct Hours'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#4F46E5] dark:text-[#818CF8] whitespace-nowrap">
                            {entry.hours_worked}h
                          </td>
                          <td className="py-2 px-3 text-[#4B5563] dark:text-[#D1D5DB] max-w-xs">
                            <p className="line-clamp-2">{entry.work_description}</p>
                            {entry.remarks && (
                              <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] italic block mt-0.5">
                                Note: {entry.remarks}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Trail Timeline */}
              {auditLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-[#30343A]">
                  <h3 className="font-semibold text-xs text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                    <span>Submission & Approval History</span>
                  </h3>
                  <div className="space-y-1.5">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded bg-[#F9FAFB] dark:bg-[#181A1D] px-3 py-1.5 text-[11px] border border-[#E5E7EB] dark:border-[#30343A]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold text-[9px] uppercase ${
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
                            By {log.actor?.name} ({log.actor?.role}): {log.comments || 'No comment'}
                          </span>
                        </div>
                        <span className="text-[#9CA3AF] dark:text-[#71717A]">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Review Actions */}
        <div className="border-t border-[#E5E7EB] dark:border-[#30343A] p-4 bg-[#F9FAFB] dark:bg-[#181A1D] shrink-0 rounded-b-lg">
          {showRejectForm ? (
            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                  Mandatory Reason for Rejection:
                </label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain clearly what corrections are needed (e.g. missing tasks, overlapping hours, inaccurate descriptions)..."
                  className="w-full rounded border border-red-300 dark:border-red-800/60 bg-white dark:bg-[#111315] p-2 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E]"
                >
                  Back to Review
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded bg-red-600 hover:bg-red-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
                >
                  {processing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                {timesheet?.status === 'Approved' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> This timesheet is approved and locked.
                  </span>
                ) : (
                  <span>Reviewing submitted work logs. Approving will lock the timesheet.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3.5 py-1.5 text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:bg-gray-50 dark:hover:bg-[#25292E] transition"
                >
                  Close
                </button>

                {timesheet?.status === 'Submitted' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(true)}
                      disabled={processing}
                      className="rounded border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-rose-950/30 px-3.5 py-1.5 text-xs font-semibold text-red-700 dark:text-rose-300 hover:bg-red-100 dark:hover:bg-rose-900/50 transition"
                    >
                      Reject Timesheet
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={processing}
                      className="rounded bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
                    >
                      {processing ? 'Approving...' : 'Approve Timesheet'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimesheetReviewModal;
