import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  BarChart3,
  AlertOctagon,
  LogOut,
  Menu,
  X,
  Compass,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Team', path: '/team', icon: Users },
  { name: 'Workload', path: '/workload', icon: BarChart3 },
  { name: 'Blockers', path: '/blockers', icon: AlertOctagon, badge: 'Escalations' },
  { name: 'My Handoffs', path: '/handoffs', icon: UserCheck },
];

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Project Manager':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Team Member':
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  const currentNav = navigationItems.find(
    (item) => location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800/80 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">TaskPilot</span>

              </div>
              <p className="text-[11px] text-slate-400">Smart Workload & Tasks</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Workspace
          </div>
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/');

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isActive
                    ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                        }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${isActive
                        ? 'bg-indigo-400/20 text-indigo-100'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Capacity in Sidebar Bottom */}
        <div className="border-t border-slate-800/80 p-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block rounded border px-1.5 py-0.2 text-[10px] font-semibold ${getRoleBadgeColor(
                      user?.role
                    )}`}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-20 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {currentNav ? currentNav.name : 'Workspace'}
              </h1>

            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* User Capacity Indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5 border border-slate-700/50 text-xs text-slate-300">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Capacity: <strong className="text-white">{user?.weekly_capacity_hours || 40}h</strong>/wk</span>
            </div>

            {/* Role Chip */}
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium border-slate-700/60 bg-slate-800/40 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Role: <strong className="text-white">{user?.role}</strong></span>
            </div>

            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-950/70 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
