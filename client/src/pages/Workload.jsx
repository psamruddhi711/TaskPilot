import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export const Workload = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Smart Workload Balancing</h2>
          <p className="text-xs text-slate-400">Team member load leveling, capacity thresholds, and burnout detection</p>
        </div>
      </div>

      {/* Concept Preview */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">Optimal Load (&lt;80%)</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-400">Balanced</p>
          <p className="mt-1 text-xs text-slate-500">System monitors target capacity vs allocated hours</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">High Load (80-100%)</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-400">Monitored</p>
          <p className="mt-1 text-xs text-slate-500">Automated warning before task assignments</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">Overallocated (&gt;100%)</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-400">Escalated</p>
          <p className="mt-1 text-xs text-slate-500">Auto-rebalancing algorithm triggers recommendation</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
          <BarChart3 className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-white">Workload Intelligence Engine</h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
          Dynamic calculations aggregating task estimates against member weekly capacity will be activated in the dedicated workload stage.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          <span>Stage Integration Scheduled</span>
        </div>
      </div>
    </div>
  );
};
