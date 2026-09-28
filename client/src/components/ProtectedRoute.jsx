import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F6F8] dark:bg-[#111315]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent"></div>
          <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F6F8] dark:bg-[#111315] p-6">
        <div className="max-w-md w-full rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-6 text-center shadow-lg">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-[#202124] dark:text-[#F3F4F6]">Access Denied</h2>
          <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
            Your role (<span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{user.role}</span>) does not have permission to access this view.
          </p>
        </div>
      </div>
    );
  }

  return children;
};
