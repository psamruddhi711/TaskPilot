import React from 'react';
import { Users, UserPlus, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Team = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#202124] dark:text-[#F3F4F6] tracking-tight">Team & Capacity</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">Team members, assigned roles, and weekly bandwidth allocation</p>
        </div>
        <button
          disabled
          className="flex items-center gap-1.5 rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] px-3.5 py-2 text-xs font-medium text-[#9CA3AF] dark:text-[#71717A] border border-[#E5E7EB] dark:border-[#30343A] cursor-not-allowed opacity-75 self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Active User Card */}
      <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Current Session Member</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 font-semibold text-sm text-[#4F46E5] dark:text-[#818CF8]">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{user?.name}</p>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Role</p>
              <span className="inline-block mt-0.5 rounded px-2 py-0.5 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30">
                {user?.role}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">Weekly Capacity</p>
              <p className="mt-0.5 text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{user?.weekly_capacity_hours || 40} hrs/wk</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-10 text-center shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-[#818CF8] mb-3 border border-indigo-200 dark:border-indigo-800/30">
          <Users className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Directory & Skills Roster</h2>
        <p className="mt-1 max-w-md text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
          Full team directory, skills matrix, and bandwidth allocation features will expand as team-level configurations are added.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] px-3 py-1.5 border border-[#E5E7EB] dark:border-[#30343A] text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
          <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Extensible Team Roster &bull; Ready</span>
        </div>
      </div>
    </div>
  );
};

export default Team;
