import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { FileText, Plus, Trash2, AlertTriangle, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';

export const WriteVisit = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', duration: '' }
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allergyWarnings, setAllergyWarnings] = useState([]);
  const [overrideWarning, setOverrideWarning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchExistingVisitAndAppointment = async () => {
      try {
        setLoading(true);
        // Get appointments list to find this appointment
        const apptRes = await api.get('/appointments/my');
        const found = apptRes.data.appointments?.find((a) => a._id === appointmentId);
        if (found) {
          setAppointment(found);
        }

        // Check if visit already exists
        try {
          const visitRes = await api.get(`/visits/appointment/${appointmentId}`);
          if (visitRes.data.success) {
            setDiagnosis(visitRes.data.visit.diagnosis || '');
            setNotes(visitRes.data.visit.notes || '');
            if (visitRes.data.prescription?.medicines?.length > 0) {
              setMedicines(visitRes.data.prescription.medicines);
            }
            if (visitRes.data.prescription?.followUpDate) {
              setFollowUpDate(visitRes.data.prescription.followUpDate.split('T')[0]);
            }
          }
        } catch {
          // No prior visit recorded, ignore
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load consultation details.');
      } finally {
        setLoading(false);
      }
    };

    fetchExistingVisitAndAppointment();
  }, [appointmentId]);

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
    // Reset override if medicines change
    setOverrideWarning(false);
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { name: '', dosage: '', duration: '' }]);
  };

  const removeMedicineRow = (index) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  // Live allergy validation check
  const handleCheckAllergies = async () => {
    const validMeds = medicines.filter((m) => m.name.trim());
    if (validMeds.length === 0) return;

    try {
      const res = await api.post('/visits/check-allergies', {
        appointmentId,
        medicines: validMeds
      });
      if (res.data.hasWarnings) {
        setAllergyWarnings(res.data.warnings);
      } else {
        setAllergyWarnings([]);
        setSuccess('No allergy conflicts detected with recorded patient allergies.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Allergy check failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const validMeds = medicines.filter((m) => m.name.trim());

    try {
      const res = await api.post('/visits', {
        appointmentId,
        diagnosis,
        notes,
        medicines: validMeds,
        followUpDate: followUpDate || null,
        overrideAllergyWarning: overrideWarning
      });

      setSuccess('Visit notes and prescription recorded successfully!');
      setTimeout(() => {
        navigate('/doctor/appointments');
      }, 1500);
    } catch (err) {
      if (err.response?.data?.isAllergyConflict) {
        setAllergyWarnings(err.response.data.warnings || []);
        setError('Clinical Allergy Warning: Prescription contains medications that conflict with patient allergies. Please review warnings below.');
      } else {
        setError(err.response?.data?.message || 'Failed to save visit record.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading patient clinical record..." />;

  const patient = appointment?.patientId;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/doctor/appointments')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Scheduled Consultations
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" /> Record Visit Notes & Prescription
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consultation with <strong className="text-slate-800">{patient?.userId?.name || 'Patient'}</strong> (ID: {patient?.patientId})
          </p>
        </div>
      </div>

      {/* Patient Clinical Info Badge */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-400 uppercase font-semibold">Blood Group:</span>{' '}
          <strong className="text-slate-800 font-bold">{patient?.bloodGroup || 'Unknown'}</strong>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-semibold">Recorded Allergies:</span>{' '}
          {patient?.allergies && patient.allergies.length > 0 ? (
            <span className="inline-flex gap-1">
              {patient.allergies.map((a, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold">
                  {a}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-emerald-600 font-medium">None reported</span>
          )}
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Allergy Warning Box */}
      {allergyWarnings.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 mb-6 text-red-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-800">
                CRITICAL ALLERGY CONFLICT DETECTED
              </h3>
              <div className="mt-2 space-y-1.5 text-xs text-red-700">
                {allergyWarnings.map((w, idx) => (
                  <div key={idx} className="bg-red-100/70 p-2 rounded border border-red-200">
                    {w.warning}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-red-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="override"
                  checked={overrideWarning}
                  onChange={(e) => setOverrideWarning(e.target.checked)}
                  className="rounded border-red-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <label htmlFor="override" className="text-xs font-semibold text-red-900 cursor-pointer">
                  I clinically acknowledge this allergy contraindication and confirm override
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Clinical Diagnosis *
          </label>
          <input
            type="text"
            required
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute Pharyngitis, Type 2 Diabetes Follow-up"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Visit Notes & Recommendations
          </label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical observations, dietary advice, lifestyle modifications..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Medicines List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Prescription Medicines
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCheckAllergies}
                className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded transition"
              >
                Pre-check Allergies
              </button>
              <button
                type="button"
                onClick={addMedicineRow}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded transition inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {medicines.map((med, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="Medicine Name (e.g. Paracetamol 500mg)"
                    value={med.name}
                    onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    required
                    placeholder="Dosage (e.g. 1 tab twice daily)"
                    value={med.dosage}
                    onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Duration (e.g. 5 days)"
                    value={med.duration}
                    onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-1 text-right">
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicineRow(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 transition"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Follow-Up Date (Optional)
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || (allergyWarnings.length > 0 && !overrideWarning)}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? 'Saving Clinical Record...' : 'Complete Visit & Issue Prescription'}
        </button>
      </form>
    </div>
  );
};
