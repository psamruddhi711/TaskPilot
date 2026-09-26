import React from 'react';
import { FolderKanban, Plus, Clock } from 'lucide-react';

export const Projects = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Projects</h2>
          <p className="text-xs text-slate-400">Manage project spaces, stages, and milestones</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-400 border border-slate-700 cursor-not-allowed opacity-75"
        >
          <Plus className="h-4 w-4" />
          <span>New Project (Stage 2)</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
          <FolderKanban className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-white">Project Workspaces Ready to Initialize</h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
          The projects schema and management module will be integrated in subsequent stages. Role-based project creation and tracking will activate seamlessly.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          <span>Pending Stage 2 Specifications</span>
        </div>
      </div>
    </div>
  );
};
