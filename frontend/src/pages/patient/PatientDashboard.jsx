import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Shield, Calendar, FileText, QrCode, Lock, Clock, Check, X, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertBanner } from '../../components/common/AlertBanner';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const profile = user?.profile || user?.patientProfile;

  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/consent/pending');
      if (res.data.success) {
        setPendingRequests(res.data.pending || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending consent requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApprove = async (consentId) => {
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post('/consent/approve-online', { consentId });
      setActionSuccess('Consent granted! The doctor now has temporary 30-minute access.');
      setPendingRequests((prev) => prev.filter((r) => r._id !== consentId));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve consent.');
    }
  };

  const handleDeny = async (consentId) => {
    setActionSuccess('');
    setActionError('');
    try {
      await api.post('/consent/deny-online', { consentId });
      setActionSuccess('Consent request denied and dismissed.');
      setPendingRequests((prev) => prev.filter((r) => r._id !== consentId));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to deny consent.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Patient Header Card */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-2xl text-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-teal-200 mb-2">
              <Shield className="w-3.5 h-3.5" /> DPDP Act 2023 Compliant Record
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{user?.name}</h1>
            <p className="text-teal-200 text-sm mt-1">
              Patient ID: <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">{profile?.patientId || 'Generating...'}</span>
              {profile?.bloodGroup && <span className="ml-3">Blood Group: <strong>{profile.bloodGroup}</strong></span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/patient/book-appointment"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-lg text-sm font-semibold transition shadow"
            >
              Book Appointment
            </Link>
            <Link
              to="/patient/emergency-card"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition backdrop-blur-sm flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" /> Emergency QR
            </Link>
          </div>
        </div>
      </div>

      <AlertBanner type="error" message={actionError} onClose={() => setActionError('')} />
      <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess('')} />

      {/* DPDP Pending Consent Requests Notice Banner */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-amber-600 animate-bounce" />
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
              Pending Doctor Consent Requests ({pendingRequests.length})
            </h2>
          </div>
          <p className="text-xs text-amber-800 mb-4">
            Under India's DPDP Act 2023, the following doctor(s) are requesting temporary permission to view your diagnostic reports and medical history:
          </p>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white p-4 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{req.doctorId?.userId?.name || 'Consulting Doctor'}</p>
                  <p className="text-xs text-slate-500">
                    {req.doctorId?.specialization} • {req.doctorId?.hospital}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Requested just now (Valid for 5 mins)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(req._id)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve Consent
                  </button>
                  <button
                    onClick={() => handleDeny(req._id)}
                    className="px-3.5 py-1.5 border border-slate-300 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-lg text-xs font-medium transition flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/patient/appointments"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 transition group"
        >
          <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">My Appointments</h3>
          <p className="text-xs text-slate-500 mt-1">View upcoming slots and launch telehealth video visits</p>
        </Link>

        <Link
          to="/patient/reports"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 transition group"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">Lab Test Reports</h3>
          <p className="text-xs text-slate-500 mt-1">Access signed, time-limited downloads of medical test files</p>
        </Link>

        <Link
          to="/patient/history"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 transition group"
        >
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">Medical History</h3>
          <p className="text-xs text-slate-500 mt-1">Timeline of doctor visits, diagnoses, and prescriptions</p>
        </Link>

        <Link
          to="/patient/access-logs"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 transition group"
        >
          <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">Who Viewed My Records</h3>
          <p className="text-xs text-slate-500 mt-1">DPDP consent audit trail of every doctor who queried your records</p>
        </Link>
      </div>

      {/* Allergies & Clinical Alerts Banner */}
      {profile?.allergies && profile.allergies.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
            Recorded Clinical Allergies
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {profile.allergies.map((allergy, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-amber-200/60 text-amber-900 rounded-md text-xs font-semibold">
                {allergy}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-2">
            These will be cross-checked automatically whenever a doctor prescribes medications for you.
          </p>
        </div>
      )}
    </div>
  );
};
