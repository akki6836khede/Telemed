import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { ShieldCheck, Lock, Clock, Eye, Stethoscope, Hospital, UserCheck } from 'lucide-react';

export const AccessLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/consent/access-logs');
        if (res.data.success) {
          setLogs(res.data.logs || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch access audit logs.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getActionLabel = (action) => {
    switch (action) {
      case 'VIEW_MEDICAL_HISTORY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            <Clock className="w-3 h-3" /> Medical History Viewed
          </span>
        );
      case 'VIEW_LAB_REPORTS':
      case 'DOWNLOAD_REPORT_PDF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <Eye className="w-3 h-3" /> Diagnostic Report Viewed / Downloaded
          </span>
        );
      case 'LOOKUP_BASIC_PROFILE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            <UserCheck className="w-3 h-3" /> Patient Identified
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-purple-600" /> Who Viewed My Records
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          A tamper-evident DPDP Act 2023 access log showing every time a doctor queried your medical records.
        </p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <LoadingSpinner message="Loading access logs..." />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Lock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No Record Access Logged</p>
          <p className="text-xs text-slate-500 mt-1">
            Your records are sealed. Whenever a doctor requests and verifies your OTP consent to review your file, the access will be stamped here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Audit Trail ({logs.length} logged events)</span>
            <span className="text-teal-700 font-bold">DPDP Principle 8: Right to Know Access History</span>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const dateStr = new Date(log.time).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              const timeStr = new Date(log.time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div key={log._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {log.doctorId?.userId?.name || 'Practicing Doctor'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Hospital className="w-3.5 h-3.5" />
                        {log.doctorId?.hospital || 'Hospital'} ({log.doctorId?.specialization || 'Physician'})
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        📅 {dateStr} at {timeStr}
                      </p>
                    </div>
                  </div>

                  <div>
                    {getActionLabel(log.action)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
