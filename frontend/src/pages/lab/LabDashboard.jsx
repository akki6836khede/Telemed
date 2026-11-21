import React, { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { FileUp, FileText, Search, UserCheck, CheckCircle2, Shield } from 'lucide-react';

export const LabDashboard = () => {
  const { user } = useAuth();

  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('Blood Test');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!patientIdInput.trim()) return;

    setLookupError('');
    setPatientData(null);
    setUploadSuccess('');
    setLookingUp(true);

    try {
      const res = await api.get(`/patients/lookup/${patientIdInput.trim()}`);
      if (res.data.success) {
        setPatientData(res.data.patient);
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Patient not found. Check the Patient ID format (e.g. PT-000001).');
    } finally {
      setLookingUp(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!patientData || !file || !title) {
      setUploadError('Please select a file and enter a title for the report.');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('patientId', patientData.patientId);
    formData.append('title', title);
    formData.append('type', type);
    formData.append('file', file);

    try {
      const res = await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setUploadSuccess(`Report "${title}" successfully uploaded and linked to ${patientData.name}'s medical file.`);
        setTitle('');
        setFile(null);
        // Reset file input element
        const fileInput = document.getElementById('report-file-input');
        if (fileInput) fileInput.value = '';
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Ensure file is PDF or image under 5MB.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-900 rounded-2xl text-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-amber-200 mb-2">
          <FileText className="w-3.5 h-3.5" /> Diagnostic Laboratory Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Diagnostic Report Upload</h1>
        <p className="text-amber-200 text-sm mt-1">
          Upload verified diagnostic test files directly to a patient's electronic medical record by Patient ID.
        </p>
      </div>

      {/* Step 1: Lookup Patient */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
        <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">1</span>
          Lookup Patient by ID
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter the patient's format-controlled identifier (e.g. <code className="font-mono text-teal-700">PT-000001</code>)
        </p>

        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              placeholder="Enter Patient ID (e.g. PT-000001)"
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={lookingUp}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-50"
          >
            {lookingUp ? 'Searching...' : 'Find Patient'}
          </button>
        </form>

        <AlertBanner type="error" message={lookupError} onClose={() => setLookupError('')} />

        {/* Patient Identity Confirmation Card */}
        {patientData && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">{patientData.name}</p>
                <p className="text-slate-600">
                  ID: <span className="font-mono font-bold text-teal-700">{patientData.patientId}</span> • Gender: {patientData.gender} • Blood Group: <strong>{patientData.bloodGroup}</strong>
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-200/80 text-emerald-900 font-bold rounded-full uppercase tracking-wider text-[10px]">
              Patient Verified
            </span>
          </div>
        )}
      </div>

      {/* Step 2: Upload Test Report */}
      {patientData && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">2</span>
            Attach & Upload Diagnostic File
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Accepts PDF documents and high-resolution medical imaging (JPEG/PNG up to 5MB). Served via secure time-limited signed URLs.
          </p>

          <AlertBanner type="error" message={uploadError} onClose={() => setUploadError('')} />
          <AlertBanner type="success" message={uploadSuccess} onClose={() => setUploadSuccess('')} />

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Report Title / Test Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Lipid Profile, Chest X-Ray PA View"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Category *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  <option value="Blood Test">Blood Test</option>
                  <option value="Radiology / X-Ray">Radiology / X-Ray</option>
                  <option value="MRI / CT Scan">MRI / CT Scan</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Medical Report Document (PDF, PNG, JPG ≤ 5MB) *
              </label>
              <input
                id="report-file-input"
                type="file"
                required
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer border border-slate-200 rounded-lg p-2"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <FileUp className="w-4 h-4" />
              {uploading ? 'Uploading & Encrypting...' : 'Upload Report to Patient Record'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
