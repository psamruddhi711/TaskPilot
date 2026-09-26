import React from 'react';
import { AlertOctagon, ShieldAlert, ArrowUpRight, Clock } from 'lucide-react';

export const Blockers = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Blocker Escalations</h2>
          <p className="text-xs text-slate-400">Dependency bottlenecks, impediment logging, and triage workflows</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 border border-slate-700 cursor-not-allowed opacity-75"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Report Blocker</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
          <AlertOctagon className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-white">Blocker Escalation & Resolution Matrix</h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
          Critical path blocker tracking, notification dispatch, and resolution logging will be implemented in the blocker management stage.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5 text-rose-400" />
          <span>Awaiting Blocker Escalation Stage</span>
        </div>
      </div>
    </div>
  );
};
