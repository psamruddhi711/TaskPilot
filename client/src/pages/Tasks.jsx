import React from 'react';
import { CheckSquare, Filter, Plus, Clock } from 'lucide-react';

export const Tasks = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Tasks & Skill Assignment</h2>
          <p className="text-xs text-slate-400">Task dependencies, estimations, and skill-based matching</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-400 border border-slate-700 cursor-not-allowed opacity-75"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
          <button
            disabled
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-400 border border-slate-700 cursor-not-allowed opacity-75"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/20">
          <CheckSquare className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-white">Skill-Based Task Assignment Module</h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
          Task creation, status pipelines, skill requirements tagging, and dependency mapping will be hooked in upcoming stages.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>Pending Subsequent Stage Instructions</span>
        </div>
      </div>
    </div>
  );
};
