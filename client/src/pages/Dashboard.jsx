import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  BarChart3, 
  AlertOctagon, 
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();

  const stageFeatures = [
    { title: 'Projects & Stages', icon: FolderKanban, desc: 'Project workspaces and milestone workflows', link: '/projects' },
    { title: 'Tasks & Skill Assignment', icon: CheckSquare, desc: 'Smart task distribution based on member capabilities', link: '/tasks' },
    { title: 'Team Capacity', icon: Users, desc: 'Weekly hour limits & bandwidth management', link: '/team' },
    { title: 'Workload Balancing', icon: BarChart3, desc: 'Automated leveling to prevent burnout', link: '/workload' },
    { title: 'Blocker Escalation', icon: AlertOctagon, desc: 'Critical issue alerts & dependency tracking', link: '/blockers' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-900/60 p-8 shadow-xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Stage 1 Initialized
              </span>
              <span className="text-xs text-slate-400">Authenticated Session</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Welcome back, {user?.name || 'Pilot'}!
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              TaskPilot core foundation is active. Monorepo architecture, JWT authentication, role guards, and database models are successfully connected.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-right">
              <p className="text-[11px] font-medium text-slate-400">Active Role</p>
              <p className="text-sm font-bold text-indigo-400">{user?.role}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-right">
              <p className="text-[11px] font-medium text-slate-400">Weekly Target</p>
              <p className="text-sm font-bold text-white">{user?.weekly_capacity_hours || 40} hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Database Engine</p>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-3 text-xl font-bold text-white">MySQL + Sequelize</p>
          <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Synced & Connected
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Auth & Security</p>
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-3 text-xl font-bold text-white">JWT + Bcrypt</p>
          <p className="mt-1 text-xs text-indigo-300">Protected Routes Enabled</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">User Capacity</p>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-xl font-bold text-white">{user?.weekly_capacity_hours || 40} hrs / wk</p>
          <p className="mt-1 text-xs text-slate-400">Base Allocation</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Current Phase</p>
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
              STAGE 1
            </span>
          </div>
          <p className="mt-3 text-xl font-bold text-white">Foundations</p>
          <p className="mt-1 text-xs text-slate-400">Ready for Stage 2</p>
        </div>
      </div>

      {/* Module Roadmap Placeholders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Upcoming System Modules</h3>
          <span className="text-xs text-slate-500">Scheduled for incremental rollout</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stageFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.title}
                to={feat.link}
                className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 transition-all hover:border-indigo-500/40 hover:bg-slate-900/70"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="mt-4 font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {feat.title}
                </h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
