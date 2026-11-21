import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { FileText, Download, ShieldCheck, Clock, ExternalLink } from 'lucide-react';

export const MyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingId, setGeneratingId] = useState(null);

  const patientId = user?.patientProfile?.patientId || user?.profile?.patientId;

  useEffect(() => {
    const fetchReports = async () => {
      if (!patientId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get(`/reports/patient/${patientId}`);
        if (res.data.success) {
          setReports(res.data.reports || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch medical reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [patientId]);

  const handleOpenReport = async (reportId) => {
    setError('');
    setGeneratingId(reportId);
    try {
      const res = await api.get(`/reports/${reportId}/signed-url`);
      if (res.data.success && res.data.signedUrl) {
        // Open time-limited signed URL in new tab
        window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate secure view token.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-teal-600" /> Diagnostic Test Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Access verified laboratory investigations uploaded by authorized diagnostic centers.
        </p>
      </div>

      {/* DPDP Privacy Alert */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 mb-6 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">DPDP Act 2023 Security Protection:</span> Reports are not served via static public URLs. Every time you view a report, a time-limited 5-minute cryptographically signed download link is generated for your active authenticated session.
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <LoadingSpinner message="Retrieving your diagnostic files..." />
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No diagnostic reports uploaded yet</p>
          <p className="text-xs text-slate-500 mt-1">
            When a diagnostic laboratory technician uploads blood tests, X-rays, or pathology reports for your Patient ID (<code className="font-mono text-teal-700">{patientId}</code>), they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => {
            const dateStr = new Date(report.createdAt || report.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const sizeKB = (report.size / 1024).toFixed(1);

            return (
              <div
                key={report._id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-teal-500 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      {report.type}
                    </span>
                    <span className="text-[11px] text-slate-400">{sizeKB} KB</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{report.title}</h3>
                  <p className="text-xs text-slate-500">File: {report.originalName}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Uploaded on {dateStr} by {report.uploadedBy?.name || 'Authorized Lab Tech'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 5-Min Signed View
                  </span>

                  <button
                    onClick={() => handleOpenReport(report._id)}
                    disabled={generatingId === report._id}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {generatingId === report._id ? 'Signing URL...' : 'View / Download'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
