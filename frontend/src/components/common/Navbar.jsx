import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, User, LogOut, ShieldCheck, Stethoscope, FileText, QrCode, HeartPulse } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    switch (role) {
      case 'patient':
        return '/patient/dashboard';
      case 'doctor':
        return '/doctor/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'lab':
        return '/lab/dashboard';
      default:
        return '/login';
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'patient':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">Patient</span>;
      case 'doctor':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-800 rounded-full flex items-center gap-1">
            <Stethoscope className="w-3 h-3" /> Doctor
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        );
      case 'lab':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
            <FileText className="w-3 h-3" /> Lab Tech
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to={isAuthenticated ? getDashboardPath() : '/login'} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">TeleMed</span>
            <span className="block text-[10px] font-semibold text-teal-600 tracking-wider uppercase">Portal & Telehealth</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Emergency Scan Quick Action Button (Always Accessible) */}
          <Link
            to="/emergency/scan"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition shadow-xs"
            title="Scan Patient Emergency Medical QR Card"
          >
            <HeartPulse className="w-4 h-4 text-red-600 animate-pulse" />
            <span>Emergency QR</span>
          </Link>

          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                {getRoleBadge()}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>

              <Link
                to={getDashboardPath()}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-teal-600 transition"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-600 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register/patient"
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg shadow-sm hover:bg-teal-700 transition"
              >
                Patient Register
              </Link>
              <Link
                to="/register/doctor"
                className="px-4 py-2 text-sm font-medium border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition hidden md:inline-block"
              >
                Doctor Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
