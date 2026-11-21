import React, { useState } from 'react';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import {
  Search,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
  Activity,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export const PatientLookup = () => {
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patient, setPatient] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Consent states
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [consentActive, setConsentActive] = useState(false);
  const [approvedUntil, setApprovedUntil] = useState(null);
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Unlocked clinical data
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'reports'
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [openingReportId, setOpeningReportId] = useState(null);

  const handleOpenReport = async (reportId) => {
    setError('');
    setOpeningReportId(reportId);
    try {
      const res = await api.get(`/reports/${reportId}/signed-url`);
      if (res.data.success && res.data.signedUrl) {
        window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate secure view token for PDF.');
    } finally {
      setOpeningReportId(null);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!patientIdInput.trim()) return;

    setLookupError('');
    setError('');
    setSuccess('');
    setPatient(null);
    setConsentActive(false);
    setOtpSent(false);
    setSimulatedOtpNotice('');
    setLookingUp(true);

    try {
      const res = await api.get(`/patients/lookup/${patientIdInput.trim()}`);
      if (res.data.success) {
        setPatient(res.data.patient);
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || 'No patient found with this ID.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!patient) return;
    setError('');
    setSuccess('');
    setSimulatedOtpNotice('');
    setRequestingOtp(true);

    try {
      const res = await api.post('/consent/request-otp', { patientId: patient.patientId });
      setOtpSent(true);
      setSuccess(res.data.message);
      if (res.data.simulatedOTP) {
        setSimulatedOtpNotice(`[Dev Simulation] Patient OTP is: ${res.data.simulatedOTP}`);
      } else {
        setSimulatedOtpNotice('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch consent OTP.');
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!patient || !otpInput.trim()) return;

    setError('');
    setSuccess('');
    setVerifyingOtp(true);

    try {
      const res = await api.post('/consent/verify-otp', {
        patientId: patient.patientId,
        otp: otpInput.trim()
      });

      setConsentActive(true);
      setApprovedUntil(res.data.approvedUntil);
      setSuccess('Patient consent verified! Records unlocked for 30 minutes.');
      fetchClinicalData(patient.patientId);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Access denied.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const fetchClinicalData = async (pId) => {
    setDataLoading(true);
    try {
      const [histRes, repRes] = await Promise.all([
        api.get(`/consent/patient/${pId}/history`),
        api.get(`/consent/patient/${pId}/reports`)
      ]);
      setHistoryTimeline(histRes.data.timeline || []);
      setReportsList(repRes.data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching records.');
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-7 h-7 text-indigo-600" /> Patient Lookup & Consent Portal
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Under DPDP Act 2023 regulations, doctors must obtain verified OTP consent from the patient before accessing clinical history and laboratory reports.
        </p>
      </div>

      <AlertBanner type="error" message={lookupError || error} onClose={() => { setLookupError(''); setError(''); }} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {simulatedOtpNotice && (
        <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-lg p-3 text-xs font-mono font-bold mb-4">
          💡 {simulatedOtpNotice}
        </div>
      )}

      {/* Lookup Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              placeholder="Enter Patient ID (e.g. PT-000001)"
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={lookingUp}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-50"
          >
            {lookingUp ? 'Searching...' : 'Search Patient'}
          </button>
        </form>
      </div>

      {/* Patient Card & Consent Action */}
      {patient && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
            <div>
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                Patient Found
              </span>
              <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ID: <span className="font-mono font-bold text-teal-700">{patient.patientId}</span> • Blood Group: <strong>{patient.bloodGroup}</strong> • Gender: {patient.gender}
              </p>
            </div>

            <div>
              {consentActive ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Consent Active (30-min session)
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Records Locked (Consent Required)
                </div>
              )}
            </div>
          </div>

          {/* Consent Verification Section */}
          {!consentActive && (
            <div className="p-6">
              {!otpSent ? (
                <div className="text-center py-6">
                  <Shield className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900">Request Explicit Patient Consent</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Send a 6-digit one-time password to the patient's registered email address to authorize viewing their past visit notes, prescriptions, and lab test files.
                  </p>
                  <button
                    onClick={handleRequestOTP}
                    disabled={requestingOtp}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm inline-flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    {requestingOtp ? 'Dispatching OTP...' : 'Request OTP Consent'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOTP} className="max-w-md mx-auto py-4 text-center">
                  <KeyRound className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Enter 6-Digit Patient OTP</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Enter the code received by the patient on their registered email to unlock records. Valid for 5 minutes.
                  </p>

                  <div className="flex gap-2 justify-center mb-4">
                    <input
                      type="text"
                      maxLength="6"
                      required
                      placeholder="••••••"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-48 text-center text-xl font-mono tracking-widest py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
                    >
                      {verifyingOtp ? 'Verifying...' : 'Unlock Records'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={requestingOtp}
                    className="text-xs text-slate-400 hover:text-indigo-600 underline"
                  >
                    Resend OTP
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Unlocked Clinical Data Tabs */}
          {consentActive && (
            <div className="p-6">
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Activity className="w-4 h-4" /> Medical History Timeline ({historyTimeline.length})
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'reports'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Lab Test Reports ({reportsList.length})
                </button>
              </div>

              {dataLoading ? (
                <LoadingSpinner message="Decrypting clinical files..." />
              ) : activeTab === 'history' ? (
                historyTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No previous medical history recorded.</p>
                ) : (
                  <div className="space-y-4">
                    {historyTimeline.map((item, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800 text-sm">{item.diagnosis}</span>
                          <span className="text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600">Consultant: {item.doctorName} ({item.hospital})</p>
                        {item.notes && <p className="text-slate-500 italic mt-1">Notes: "{item.notes}"</p>}
                        {item.prescription?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">Prescription:</span>
                            <ul className="list-disc list-inside mt-0.5 text-slate-600">
                              {item.prescription.map((m, mi) => (
                                <li key={mi}>{m.name} - {m.dosage} ({m.duration})</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                reportsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No lab reports found for this patient.</p>
                ) : (
                  <div className="space-y-3">
                    {reportsList.map((rep) => (
                      <div
                        key={rep._id}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-indigo-300 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                              {rep.type}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(rep.createdAt || rep.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm">{rep.title}</p>
                          <p className="text-slate-500 mt-0.5">
                            File: <span className="font-mono text-slate-700">{rep.originalName || 'Diagnostic_Report.pdf'}</span>
                            {rep.size ? ` (${(rep.size / 1024).toFixed(1)} KB)` : ''}
                          </p>
                          {rep.uploadedBy?.name && (
                            <p className="text-slate-400 text-[11px] mt-0.5">Uploaded by: {rep.uploadedBy.name}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleOpenReport(rep._id)}
                            disabled={openingReportId === rep._id}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                            title="Open secure signed PDF report"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {openingReportId === rep._id ? 'Generating Link...' : 'View / Download PDF'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
