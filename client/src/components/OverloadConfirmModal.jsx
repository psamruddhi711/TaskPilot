import React from 'react';
import { X, ShieldAlert, UserCheck } from 'lucide-react';

export const OverloadConfirmModal = ({ isOpen, onClose, onConfirm, overloadData }) => {
  if (!isOpen || !overloadData) return null;

  const {
    user_name,
    weekly_capacity_hours,
    current_assigned_hours,
    task_estimated_hours,
    projected_hours,
    excess_hours,
    projected_utilization
  } = overloadData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] shadow-xl p-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[#E5E7EB] dark:border-[#30343A]">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Capacity Overload Warning</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400/90">Target team member will exceed 100% bandwidth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message */}
        <div className="mt-4 space-y-3.5">
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
            Assigning this task to <strong className="text-[#202124] dark:text-[#F3F4F6] font-semibold">{user_name}</strong> requires{' '}
            <strong className="text-[#4F46E5] dark:text-[#818CF8] font-semibold">{task_estimated_hours} hours</strong>, which will exceed their weekly threshold.
          </p>

          {/* Breakdown Card */}
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              <span>Weekly Capacity Limit:</span>
              <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{weekly_capacity_hours} hrs/wk</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              <span>Current Active Workload:</span>
              <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{current_assigned_hours} hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              <span>Task Estimated Effort:</span>
              <span className="font-medium text-[#4F46E5] dark:text-[#818CF8]">+{task_estimated_hours} hrs</span>
            </div>
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#30343A] flex items-center justify-between text-xs font-semibold">
              <span className="text-red-600 dark:text-red-400">Projected Workload:</span>
              <span className="text-red-600 dark:text-red-400">
                {projected_hours} hrs ({projected_utilization}%, +{excess_hours}h excess)
              </span>
            </div>
          </div>

          {/* Utilization Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mb-1">
              <span>Utilization Impact</span>
              <span className="text-red-600 dark:text-red-400 font-medium">{projected_utilization}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#30343A]">
              <div
                className="h-full rounded-full bg-red-600 transition-all"
                style={{ width: `${Math.min(100, projected_utilization)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
            Managers may override this limit when team balancing requires temporary over-allocation.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3.5 border-t border-[#E5E7EB] dark:border-[#30343A]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-medium text-white transition shadow-sm"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Confirm & Override Assignment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverloadConfirmModal;
