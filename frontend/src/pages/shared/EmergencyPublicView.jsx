import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { HeartPulse, AlertTriangle, Pill, Phone, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const EmergencyPublicView = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicEmergency = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/emergency/public/${token}`);
        if (res.data.success) {
          setData(res.data.emergencySummary);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Emergency card unavailable or disabled by patient.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicEmergency();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <LoadingSpinner message="Accessing Emergency Triage Summary..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Emergency Access Blocked</h1>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            {error || 'This emergency medical token is invalid or has been deactivated by the patient.'}
          </p>
          <div className="text-xs text-slate-400">
            India DPDP Act 2023 Protected Health Information
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-lg border-2 border-red-500 overflow-hidden">
        {/* Emergency Triage Header */}
        <div className="bg-red-600 text-white p-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <HeartPulse className="w-4 h-4 animate-pulse" /> Emergency Medical Triage
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{data.patientName}</h1>
          <p className="text-red-100 text-xs font-mono mt-1">Patient ID: {data.patientId}</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Blood Group Highlight Card */}
          <div className="flex items-center justify-between p-5 bg-red-50 border border-red-200 rounded-2xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-800">Blood Group</p>
              <p className="text-4xl font-black text-red-700 mt-0.5">{data.bloodGroup || 'UNKNOWN'}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-red-200 text-red-900 font-bold text-xs rounded-full uppercase">
                Critical Info
              </span>
            </div>
          </div>

          {/* Allergies Alert */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recorded Critical Allergies
            </h2>
            {data.allergies && data.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold"
                  >
                    ⚠️ {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                ✓ No recorded clinical allergies
              </p>
            )}
          </div>

          {/* Active Medications */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-indigo-600" />
              Active Prescribed Medications
            </h2>
            {data.currentMedications && data.currentMedications.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden text-xs">
                {data.currentMedications.map((med, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <span className="font-bold text-slate-900">{med.name}</span>
                    <span className="text-slate-500">{med.dosage}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                No active ongoing prescriptions on file.
              </p>
            )}
          </div>

          {/* Emergency Contact */}
          {data.emergencyContactPhone && (
            <div className="pt-4 border-t border-slate-100">
              <a
                href={`tel:${data.emergencyContactPhone}`}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow"
              >
                <Phone className="w-4 h-4" /> Call Emergency Contact ({data.emergencyContactPhone})
              </a>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400">
              DPDP Act 2023 Minimal Data Disclosure • Timestamp: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
