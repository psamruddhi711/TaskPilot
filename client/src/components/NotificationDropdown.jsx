import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, AlertTriangle, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { notificationAPI } from '../services/api';

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'blocker_escalation':
      case 'blocker_escalated':
        return (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/50">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
        );
      case 'blocker_warning':
        return (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800/50">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        );
      case 'task_blocked':
        return (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/50">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        );
      case 'blocker_resolved':
        return (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/50">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-50 text-[#4F46E5] border border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border-indigo-800/50">
            <Bell className="h-3.5 w-3.5" />
          </div>
        );
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#1C1F23] text-[#6B7280] dark:text-[#A1A1AA] hover:border-gray-300 dark:hover:border-[#474D56] hover:text-[#202124] dark:hover:text-[#F3F4F6] transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] shadow-xl z-[100] overflow-hidden transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#30343A] px-4 py-2.5 bg-[#F8F9FA] dark:bg-[#181A1D]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded bg-red-50 dark:bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-medium text-red-600 dark:text-rose-400 border border-red-200 dark:border-rose-500/20">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#30343A]/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[#9CA3AF] dark:text-[#71717A] px-4">
                <Bell className="h-6 w-6 mx-auto mb-1.5 opacity-40 text-[#9CA3AF] dark:text-[#71717A]" />
                <p className="text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]">No new notifications</p>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#71717A] mt-0.5">You're completely up to date.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 p-3 transition-colors ${
                    !n.read
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                      : 'hover:bg-gray-50 dark:hover:bg-[#25292E]/50'
                  }`}
                >
                  {getNotificationIcon(n.type)}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`text-xs leading-relaxed ${!n.read ? 'text-[#202124] dark:text-[#F3F4F6] font-medium' : 'text-[#6B7280] dark:text-[#A1A1AA]'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-[#9CA3AF] dark:text-[#71717A]">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      title="Mark as read"
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#9CA3AF] dark:text-[#71717A] hover:bg-gray-200 dark:hover:bg-[#30343A] hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

