import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { ShieldCheck, Check, X, Users, UserCheck, Clock, Stethoscope, AlertCircle } from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'verified', 'all'
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, doctorsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/doctors')
      ]);
      setStats(statsRes.data.stats);
      setDoctors(doctorsRes.data.doctors);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyToggle = async (doctorId, newStatus) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.patch(`/admin/doctors/${doctorId}/verify`, { verified: newStatus });
      setActionSuccess(res.data.message);
      // Update local state
      setDoctors((prev) =>
        prev.map((d) => (d._id === doctorId ? { ...d, verified: newStatus } : d))
      );
      // Refresh stats
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data.stats);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Verification update failed.');
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    if (filter === 'pending') return !doc.verified;
    if (filter === 'verified') return doc.verified;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-800 to-slate-900 rounded-2xl text-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-purple-200 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" /> Platform Administration
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Control Center</h1>
        <p className="text-purple-200 text-sm mt-1">
          Review medical practitioner licenses and monitor telehealth platform metrics.
        </p>
      </div>

      <AlertBanner type="error" message={actionError} onClose={() => setActionError('')} />
      <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess('')} />

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Total Patients</span>
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPatients}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Pending Doctors</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pendingDoctors}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Verified Doctors</span>
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.verifiedDoctors}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Total Users</span>
              <Stethoscope className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
          </div>
        </div>
      )}

      {/* Doctor Verification Management Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Doctor Verification Requests</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctors must be verified before they can publish slots or access patient records.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === 'pending' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({doctors.filter((d) => !d.verified).length})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === 'verified' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verified ({doctors.filter((d) => d.verified).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({doctors.length})
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading doctor directory..." />
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No doctors found matching "{filter}" status</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Doctor Name</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Hospital / Affiliation</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDoctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {doc.userId?.name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4">{doc.specialization}</td>
                    <td className="py-3 px-4 text-slate-600">{doc.hospital}</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{doc.userId?.email}</div>
                      <div className="text-slate-400">{doc.userId?.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {doc.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!doc.verified ? (
                        <button
                          onClick={() => handleVerifyToggle(doc._id, true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Doctor
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyToggle(doc._id, false)}
                          className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Revoke Approval
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
