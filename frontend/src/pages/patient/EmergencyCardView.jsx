import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { QrCode, RefreshCw, Power, Shield, Copy, Check, ExternalLink, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EmergencyCardView = () => {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/emergency/card');
      if (res.data.success) {
        setCard(res.data.card);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load emergency QR card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, []);

  const handleCopyLink = () => {
    if (!card?.publicUrl) return;
    navigator.clipboard.writeText(card.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure you want to regenerate your emergency token? Any previously printed or shared QR codes will be immediately invalidated.')) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/emergency/regenerate');
      if (res.data.success) {
        setSuccess('Security token regenerated. Old QR code has been revoked.');
        setCard((prev) => ({
          ...prev,
          emergencyToken: res.data.emergencyToken,
          publicUrl: res.data.publicUrl
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const newStatus = !card.isEnabled;
      const res = await api.patch('/emergency/toggle', { enabled: newStatus });
      if (res.data.success) {
        setSuccess(`Emergency card access is now ${newStatus ? 'enabled' : 'disabled'}.`);
        setCard((prev) => ({ ...prev, isEnabled: newStatus }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="w-7 h-7 text-teal-600" /> Emergency Medical QR Card
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          A secure, unguessable QR card that allows first responders and emergency room staff to access your vital triage data (Blood Group, Allergies, Current Medications) during an emergency.
        </p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner message="Generating emergency QR cryptographic card..." />
      ) : card ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* QR Code Presentation Box */}
          <div className="md:col-span-6 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Live Emergency QR
              </span>
            </div>

            <div className={`p-4 bg-white border-4 rounded-2xl shadow-sm mb-4 transition ${
              card.isEnabled ? 'border-teal-500' : 'border-slate-300 opacity-50'
            }`}>
              <QRCodeSVG
                value={card.publicUrl}
                size={210}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-xs font-semibold text-slate-700">
              Scan with any mobile camera in an emergency
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Encodes unguessable 256-bit secure token
            </p>

            <div className="w-full mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Link Copied!' : 'Copy Emergency Link'}
              </button>

              <a
                href={card.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview First Responder View
              </a>

              <Link
                to="/emergency/scan"
                className="w-full py-2 px-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <HeartPulse className="w-3.5 h-3.5 text-red-600" /> Open Emergency Scanner
              </Link>
            </div>
          </div>

          {/* Controls & Privacy Details */}
          <div className="md:col-span-6 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                Card Access Settings
              </h2>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">Emergency Access Status</p>
                  <p className="text-xs text-slate-500">
                    {card.isEnabled ? 'Active: First responders can scan this card' : 'Disabled: Scanning will be blocked'}
                  </p>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={actionLoading}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    card.isEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {card.isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs font-bold text-amber-900 mb-1">Revocation & Token Regeneration</p>
                <p className="text-[11px] text-amber-800 mb-3">
                  If you lost your card or wish to revoke old access links, regenerate your token now.
                </p>
                <button
                  onClick={handleRegenerate}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate Token
                </button>
              </div>
            </div>

            {/* DPDP Act 2023 Principles Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-xs text-slate-600 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" /> DPDP Act 2023 Data Minimization
              </h3>
              <p>
                • <strong>Minimal Disclosure:</strong> Only emergency-critical attributes (Blood group, allergies, current medications, emergency contact) are revealed.
              </p>
              <p>
                • <strong>No Sensitive History:</strong> Detailed visit notes, diagnoses, and lab test files are strictly withheld from the emergency QR page.
              </p>
              <p>
                • <strong>Instant Revocation:</strong> You hold sovereign control to disable or regenerate your token anytime.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
