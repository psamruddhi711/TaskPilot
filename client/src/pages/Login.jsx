import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Lock, Mail, User, Shield, Clock, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    weekly_capacity_hours: 40
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'weekly_capacity_hours' ? parseInt(value, 10) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.name.trim()) {
          throw new Error('Please enter your full name.');
        }
        await register(formData);
      } else {
        await login(formData.email, formData.password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (email) => {
    setFormData((prev) => ({
      ...prev,
      email,
      password: 'password123'
    }));
    setIsRegister(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F5F6F8] dark:bg-[#111315] p-4 font-sans text-[#202124] dark:text-[#F3F4F6] transition-colors duration-150">
      <div className="w-full max-w-sm rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-6 shadow-sm transition-colors">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-[#4F46E5] text-white shadow-xs">
            <Compass className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-[#202124] dark:text-white">
            TaskPilot
          </h1>
          <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            Smart workload & task management
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mb-5 flex rounded-md bg-[#F1F3F5] dark:bg-[#111315] p-1 border border-[#E5E7EB] dark:border-[#30343A]">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${!isRegister
              ? 'bg-white text-[#202124] font-semibold shadow-xs dark:bg-[#25292E] dark:text-white'
              : 'text-[#6B7280] hover:text-[#202124] dark:text-[#A1A1AA] dark:hover:text-white'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${isRegister
              ? 'bg-white text-[#202124] font-semibold shadow-xs dark:bg-[#25292E] dark:text-white'
              : 'text-[#6B7280] hover:text-[#202124] dark:text-[#A1A1AA] dark:hover:text-white'
              }`}
          >
            Register
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-2.5 text-xs text-red-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Samruddhi Patil"
                  required={isRegister}
                  className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] py-2 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] focus:ring-1 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@gmail.com"
                required
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] py-2 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] focus:ring-1 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] py-2 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] focus:ring-1 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8] transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] py-2 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] focus:ring-1 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8] transition-colors"
                  >
                    <option value="Team Member">Team Member</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]">
                  Weekly Capacity (Hours)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
                  <input
                    type="number"
                    name="weekly_capacity_hours"
                    min={0}
                    max={168}
                    value={formData.weekly_capacity_hours}
                    onChange={handleChange}
                    className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F9FAFB] dark:bg-[#111315] py-2 pl-9 pr-3 text-xs text-[#202124] dark:text-[#F3F4F6] placeholder-[#9CA3AF] dark:placeholder-[#71717A] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] focus:ring-1 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8] transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#4F46E5] hover:bg-[#4338CA] py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
          >
            {loading
              ? 'Processing...'
              : isRegister
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>


      </div>
    </div>
  );
};

export default Login;

