import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, CheckCircle2, AlertOctagon, Calendar, Users, FilePlus, QrCode, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const profile = user?.profile || user?.doctorProfile;
  const isVerified = !!profile?.verified;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Verification Status Banner */}
      {!isVerified ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-8 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
              <AlertOctagon className="w-8 h-8 flex-shrink-0" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Account Verification Pending</h2>
              <p className="text-sm text-amber-800 mt-1">
                Your medical registration is awaiting approval by an Administrator. During this period, you cannot manage availability slots, look up patient records, or start consultations.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider rounded-full">
            Under Review
          </span>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-sky-800 to-indigo-900 rounded-2xl text-white p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-medium mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Medical Practitioner
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{user?.name}</h1>
              <p className="text-sky-200 text-sm mt-1">
                {profile?.specialization} • {profile?.hospital}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                to="/doctor/slots"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-semibold transition shadow"
              >
                Manage Slots
              </Link>
              <Link
                to="/doctor/lookup"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition backdrop-blur-sm"
              >
                Patient Lookup (OTP)
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/doctor/slots"
          className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition ${
            !isVerified ? 'opacity-50 pointer-events-none' : 'hover:border-sky-500 group'
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">Availability Slots</h3>
          <p className="text-xs text-slate-500 mt-1">Set daily consultation hours and manage booking slots</p>
        </Link>

        <Link
          to="/doctor/lookup"
          className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition ${
            !isVerified ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-500 group'
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">Patient Lookup (OTP)</h3>
          <p className="text-xs text-slate-500 mt-1">Search by Patient ID (PT-XXXXXX) with mandatory DPDP OTP consent</p>
        </Link>

        <Link
          to="/doctor/appointments"
          className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition ${
            !isVerified ? 'opacity-50 pointer-events-none' : 'hover:border-teal-500 group'
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <FilePlus className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">Consultations</h3>
          <p className="text-xs text-slate-500 mt-1">Launch Jitsi telehealth room & record visit notes with allergy checks</p>
        </Link>

        <Link
          to="/emergency/scan"
          className="bg-white p-6 rounded-xl border border-red-200 hover:border-red-500 shadow-sm transition group"
        >
          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
            <HeartPulse className="w-6 h-6 text-red-600 animate-pulse" />
          </div>
          <h3 className="font-semibold text-slate-800">Scan Emergency QR</h3>
          <p className="text-xs text-slate-500 mt-1">Scan incoming patient's emergency card for vital blood group & allergies</p>
        </Link>
      </div>
    </div>
  );
};
