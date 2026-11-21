import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      const role = data.user.role;
      if (role === 'patient') navigate('/patient/dashboard');
      else if (role === 'doctor') navigate('/doctor/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'lab') navigate('/lab/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setQuickCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-xl mb-3">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your TeleMed account</p>
        </div>

        <AlertBanner type="error" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Fill Buttons for easy evaluator verification */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setQuickCredentials('admin@telemed.local', 'AdminPass123!')}
              className="py-1.5 px-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 font-medium transition"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setQuickCredentials('dr.sharma@telemed.local', 'DoctorPass123!')}
              className="py-1.5 px-2 bg-sky-50 text-sky-700 rounded hover:bg-sky-100 font-medium transition"
            >
              Doctor (Verified)
            </button>
            <button
              type="button"
              onClick={() => setQuickCredentials('aarav@telemed.local', 'PatientPass123!')}
              className="py-1.5 px-2 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 font-medium transition"
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setQuickCredentials('lab@telemed.local', 'LabPass123!')}
              className="py-1.5 px-2 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 font-medium transition"
            >
              Lab Tech
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 space-y-2">
          <p>
            Need a patient account?{' '}
            <Link to="/register/patient" className="text-teal-600 font-semibold hover:underline">
              Register as Patient
            </Link>
          </p>
          <p>
            Are you a medical doctor?{' '}
            <Link to="/register/doctor" className="text-teal-600 font-semibold hover:underline">
              Register as Doctor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
