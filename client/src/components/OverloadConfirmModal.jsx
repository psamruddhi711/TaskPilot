import React from 'react';
import { AlertTriangle, X, ShieldAlert, Clock, UserCheck, ArrowRight } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900 shadow-2xl p-6 md:p-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Capacity Overload Warning</h3>
              <p className="text-xs text-rose-300">Target team member will exceed 100% bandwidth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mt-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Assigning this task to <strong className="text-white">{user_name}</strong> requires{' '}
            <strong className="text-indigo-400">{task_estimated_hours} hours</strong>, which will overload their weekly capacity limit.
          </p>

          {/* Breakdown Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Weekly Capacity Threshold:</span>
              <span className="font-semibold text-white">{weekly_capacity_hours} hrs/wk</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Current Active Workload:</span>
              <span className="font-semibold text-slate-300">{current_assigned_hours} hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Task Estimated Effort:</span>
              <span className="font-semibold text-indigo-400">+{task_estimated_hours} hrs</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
              <span className="text-rose-400">Projected Workload:</span>
              <span className="text-rose-400">
                {projected_hours} hrs ({projected_utilization}%, +{excess_hours}h excess)
              </span>
            </div>
          </div>

          {/* Utilization Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Utilization Impact</span>
              <span className="text-rose-400 font-bold">{projected_utilization}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-rose-500 transition-all"
                style={{ width: `${Math.min(100, projected_utilization)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Managers may override this limit when team balancing requires temporary over-allocation.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 hover:brightness-110 active:scale-[0.98] transition"
          >
            <UserCheck className="h-4 w-4" />
            <span>Confirm & Override Assignment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
