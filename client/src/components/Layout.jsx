import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';

const getNavigationItems = (role) => {
  const items = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Workload', path: '/workload', icon: BarChart3 },
    {
      name: 'Timesheet',
      path: '/timesheet',
      icon: Clock,
      badge: 'New',
      badgeColor: 'bg-indigo-50 text-[#4F46E5] border border-indigo-200 dark:bg-indigo-950/60 dark:text-[#818CF8] dark:border-indigo-800/50'
    }
  ];

  if (role === 'Admin' || role === 'Project Manager') {
    items.push({
      name: 'Timesheet Approvals',
      path: '/timesheet-approvals',
      icon: ClipboardCheck,
      badge: 'Manager',
      badgeColor: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50'
    });
  }

  items.push(
    { name: 'Team', path: '/team', icon: Users },
    { name: 'Blockers', path: '/blockers', icon: AlertOctagon, badge: 'Escalations' },
    { name: 'My Handoffs', path: '/handoffs', icon: UserCheck }
  );

  return items;
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = getNavigationItems(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50';
      case 'Project Manager':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50';
      case 'Team Member':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#25292E] dark:text-[#A1A1AA] dark:border-[#30343A]';
    }
  };

  const currentNav = navigationItems.find(
    (item) => location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')
  );

  return (
    <div className="flex h-screen w-full bg-[#F5F6F8] dark:bg-[#111315] text-[#202124] dark:text-[#F3F4F6] overflow-hidden font-sans transition-colors duration-150">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4F46E5] text-white shadow-xs">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[#202124] dark:text-white">TaskPilot</span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-[#71717A]">
            Workspace
          </div>
          <nav className="space-y-1">
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
                  className={`group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-[#4F46E5] font-semibold border-l-2 border-[#4F46E5] dark:bg-indigo-500/15 dark:text-[#818CF8] dark:border-[#818CF8]'
                      : 'text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive
                          ? 'text-[#4F46E5] dark:text-[#818CF8]'
                          : 'text-[#9CA3AF] dark:text-[#71717A] group-hover:text-[#6B7280] dark:group-hover:text-[#A1A1AA]'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                        isActive
                          ? 'bg-indigo-100 text-[#4F46E5] dark:bg-indigo-500/20 dark:text-[#818CF8]'
                          : item.badgeColor || 'bg-red-50 text-red-700 border border-red-200 dark:bg-rose-500/10 dark:text-[#F87171] dark:border-rose-500/20'
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

        {/* User Profile in Sidebar Footer */}
        <div className="border-t border-[#E5E7EB] dark:border-[#30343A] p-3">
          <div className="flex items-center justify-between rounded-md bg-[#F1F3F5] dark:bg-[#1C1F23] p-2.5 border border-[#E5E7EB] dark:border-[#30343A]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white dark:bg-[#25292E] text-xs font-semibold text-[#202124] dark:text-white border border-[#E5E7EB] dark:border-[#30343A]">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{user?.name || 'User'}</p>
                <span
                  className={`inline-block rounded border px-1.5 py-0.2 text-[9px] font-medium ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded p-1.5 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-rose-500/10 hover:text-red-600 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] bg-white/95 dark:bg-[#181A1D]/95 px-5 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded p-1.5 text-[#6B7280] dark:text-[#A1A1AA] hover:bg-gray-100 dark:hover:bg-[#25292E] hover:text-[#202124] dark:hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-[#202124] dark:text-white">
              {currentNav ? currentNav.name : 'Workspace'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* User Capacity Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-[#F1F3F5] dark:bg-[#1C1F23] px-2.5 py-1 border border-[#E5E7EB] dark:border-[#30343A] text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              <Clock className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <span>Cap: <strong className="text-[#202124] dark:text-[#F3F4F6] font-medium">{user?.weekly_capacity_hours || 40}h</strong>/wk</span>
            </div>

            {/* Role Chip */}
            <div className="hidden md:flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#1C1F23] px-2.5 py-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{user?.role}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center justify-center h-8 w-8 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#1C1F23] text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#25292E] transition-colors"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#1C1F23] px-2.5 py-1 text-xs font-medium text-[#4B5563] dark:text-[#A1A1AA] hover:border-gray-300 dark:hover:border-[#474D56] hover:text-[#202124] dark:hover:text-white transition-colors"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#F5F6F8] dark:bg-[#111315] p-5 sm:p-6 md:p-7 transition-colors">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

