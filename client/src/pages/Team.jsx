import React from 'react';
import { Users, UserPlus, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Team = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Team & Capacity</h2>
          <p className="text-xs text-slate-400">Team members, assigned roles, and weekly bandwidth</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 border border-slate-700 cursor-not-allowed opacity-75"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Active User Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-4">Current Session Member</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-bold text-lg text-white">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Role</p>
              <span className="inline-block mt-0.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                {user?.role}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Weekly Capacity</p>
              <p className="mt-0.5 text-xs font-bold text-white">{user?.weekly_capacity_hours || 40} hrs/wk</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
          <Users className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-white">Directory & Skills Roster</h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
          Full team directory, skills matrix, and bandwidth allocation features will expand as subsequent stages specify team-level operations.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5 text-emerald-400" />
          <span>Extensible Team Roster &bull; Ready</span>
        </div>
      </div>
    </div>
  );
};
