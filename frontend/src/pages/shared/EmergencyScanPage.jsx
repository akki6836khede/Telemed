import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Upload,
  HeartPulse,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileSearch,
  ScanLine
} from 'lucide-react';
import { AlertBanner } from '../../components/common/AlertBanner';

/**
 * Extracts the emergency token from a scanned URL or raw string.
 */
export const extractEmergencyToken = (rawText) => {
  if (!rawText) return '';
  const trimmed = rawText.trim();
  // Check if string is a URL containing /emergency/<token>
  const match = trimmed.match(/\/emergency\/(?:summary\/)?([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise treat as plain token
  return trimmed;
};

export const EmergencyScanPage = () => {
  const navigate = useNavigate();

  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [fileProcessing, setFileProcessing] = useState(false);
  const [error, setError] = useState('');
  const [scannedResult, setScannedResult] = useState(null);

  const qrRegionId = 'emergency-qr-reader';
  const html5QrCodeRef = useRef(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSuccessfulScan = (decodedText) => {
    const token = extractEmergencyToken(decodedText);
    if (!token) {
      setError('Invalid QR code format. Expected TeleMed Emergency Card.');
      return;
    }

    setScannedResult(token);
    stopCamera();

    // Small delay to show success feedback before navigation
    setTimeout(() => {
      navigate(`/emergency/${token}`);
    }, 800);
  };

  const startCamera = async () => {
    setError('');
    setCameraError('');
    setScannedResult(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' }, // Prefer back camera on mobile
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame parse failure (normal when QR is not yet aligned)
        }
      );

      setCameraActive(true);
    } catch (err) {
      console.error('Camera startup error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions or use Photo/Manual upload.');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
    }
    setCameraActive(false);
  };

  // Start camera automatically when switching to camera mode
  useEffect(() => {
    if (activeMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeMode]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileProcessing(true);

    try {
      const fileScanner = new Html5Qrcode('file-scanner-temp');
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      handleSuccessfulScan(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setError('No valid Emergency QR code detected in this image. Please ensure the QR is sharp and well-lit.');
    } finally {
      setFileProcessing(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const token = extractEmergencyToken(manualInput);
    if (!token) {
      setError('Please provide a valid token or emergency URL.');
      return;
    }

    navigate(`/emergency/${token}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hidden container for file scanning */}
      <div id="file-scanner-temp" className="hidden"></div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl text-white p-6 sm:p-8 shadow-md mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <HeartPulse className="w-4 h-4 animate-pulse text-red-200" />
          First Responder & ER Triage
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Emergency QR Scanner
        </h1>
        <p className="text-red-100 text-sm mt-2 max-w-xl">
          Scan a patient's physical or digital Emergency QR card to access their critical life-saving triage data (Blood Group, Severe Allergies, Current Medications) in real-time.
        </p>
      </div>

      <AlertBanner type="error" message={error || cameraError} onClose={() => { setError(''); setCameraError(''); }} />

      {scannedResult && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 mb-6 flex items-center gap-3 text-emerald-900 animate-fade-in">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base">QR Code Verified!</h3>
            <p className="text-xs text-emerald-700 mt-0.5">Redirecting to Emergency Triage Medical Summary...</p>
          </div>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 mb-6 flex gap-1.5">
        <button
          onClick={() => setActiveMode('camera')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 ${
            activeMode === 'camera'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" /> Live Camera
        </button>

        <button
          onClick={() => setActiveMode('file')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 ${
            activeMode === 'file'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" /> Upload Image
        </button>

        <button
          onClick={() => setActiveMode('manual')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 ${
            activeMode === 'manual'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSearch className="w-4 h-4" /> Token / URL
        </button>
      </div>

      {/* Active Mode Body */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* CAMERA MODE */}
        {activeMode === 'camera' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-full max-w-md relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-inner min-h-[300px] flex items-center justify-center">
              <div id={qrRegionId} className="w-full h-full"></div>

              {!cameraActive && (
                <div className="p-8 text-slate-400 flex flex-col items-center">
                  <ScanLine className="w-12 h-12 text-slate-500 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-200">Camera Paused</p>
                  <p className="text-xs text-slate-400 mt-1">Click Start Camera to begin scanning</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Pause Camera
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Point your camera at the patient's Emergency QR Card. Scanning will auto-detect and open the triage file.
            </p>
          </div>
        )}

        {/* FILE UPLOAD MODE */}
        {activeMode === 'file' && (
          <div className="flex flex-col items-center text-center py-6">
            <label className="w-full max-w-md border-2 border-dashed border-slate-300 hover:border-red-500 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 hover:bg-red-50/30 group">
              <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Upload className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold text-slate-800">
                {fileProcessing ? 'Analyzing Image...' : 'Click or Drag to Upload QR Image'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Supports PNG, JPG, WEBP photos or screenshots
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={fileProcessing}
                className="hidden"
              />
            </label>

            {fileProcessing && (
              <p className="text-xs font-semibold text-red-600 mt-4 animate-pulse">
                Scanning image for cryptographic emergency token...
              </p>
            )}
          </div>
        )}

        {/* MANUAL INPUT MODE */}
        {activeMode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="max-w-md mx-auto py-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Emergency Token or Link
            </label>
            <input
              type="text"
              required
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Paste token (e.g. b92f1b4c-...) or full emergency link"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono mb-4"
            />
            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              Open Emergency Triage File <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* DPDP Legal Disclaimer Box */}
      <div className="mt-8 bg-slate-100 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">DPDP Act 2023 - Emergency Exemption:</span> Under Section 7(b) of the Digital Personal Data Protection Act 2023, personal data required for providing medical treatment or health service to an individual during an epidemic, outbreak of disease, or any other threat to life may be processed without prior consent. The Emergency Medical QR Card exposes only minimal necessary triage data (Blood Group, Allergies, Current Medications) to assist clinical personnel.
        </div>
      </div>
    </div>
  );
};
