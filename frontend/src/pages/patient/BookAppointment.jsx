import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Stethoscope, Calendar, Clock, Check, ArrowRight, Hospital } from 'lucide-react';
// Appointment
export const BookAppointment = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');

  // Fetch verified doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const res = await api.get('/doctors');
        if (res.data.success) {
          setDoctors(res.data.doctors);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load doctors.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // When a doctor is selected, fetch their available slots
  const handleSelectDoctor = async (doc) => {
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setError('');
    setSlotsLoading(true);
    try {
      const res = await api.get(`/doctors/${doc._id}/slots`);
      if (res.data.success) {
        // filter only uned slots
        const available = (res.data.slots || []).filter((s) => !s.ised);
        setSlots(available);
      }
    } catch (err) {
      setError('Failed to fetch doctor availability slots.');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handle = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      setError('Please select both a doctor and a consultation slot.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // Build ISO DateTime from slot date & startTime
      const dateTimeISO = new Date(`${selectedSlot.date}T${selectedSlot.startTime}:00`).toISOString();

      const res = await api.post('/appointments/book', {
        doctorId: selectedDoctor._id,
        dateTime: dateTimeISO,
        slotId: selectedSlot._id,
        notes
      });

      setSuccess('Appointment successfully ed! Redirecting to your appointments...');
      setTimeout(() => {
        navigate('/patient/appointments');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'ing failed. The slot may have just been taken.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = specializationFilter
    ? doctors.filter((d) => d.specialization.toLowerCase().includes(specializationFilter.toLowerCase()))
    : doctors;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-teal-600" />  Telehealth Consultation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose a verified doctor, pick an open slot, and schedule your live telehealth video consultation.
        </p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Step 1: Select Verified Doctor */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
              Select Verified Doctor
            </h2>
            <span className="text-xs text-slate-400">{filteredDoctors.length} doctors</span>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter by specialization..."
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {loading ? (
            <LoadingSpinner message="Loading doctors..." />
          ) : filteredDoctors.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No verified doctors found.</p>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredDoctors.map((doc) => {
                const isSelected = selectedDoctor?._id === doc._id;
                return (
                  <div
                    key={doc._id}
                    onClick={() => handleSelectDoctor(doc)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${isSelected
                      ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{doc.userId?.name}</h3>
                      <p className="text-xs text-teal-700 font-semibold">{doc.specialization}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Hospital className="w-3.5 h-3.5" /> {doc.hospital}
                      </p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-teal-600" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2 & 3: Slot Selection & Confirmation */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
            Pick Consultation Slot & Confirm
          </h2>

          {!selectedDoctor ? (
            <div className="p-12 text-center text-slate-400">
              <Stethoscope className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Please select a doctor on the left first.</p>
            </div>
          ) : slotsLoading ? (
            <LoadingSpinner message="Checking doctor schedule..." />
          ) : slots.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">
                {selectedDoctor.userId?.name} has no open slots currently.
              </p>
              <p className="text-xs text-slate-400 mt-1">Please select another doctor.</p>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                  Available Consultation Slots
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto">
                  {slots.map((s) => {
                    const isSlotSelected = selectedSlot?._id === s._id;
                    return (
                      <button
                        type="button"
                        key={s._id}
                        onClick={() => setSelectedSlot(s)}
                        className={`p-3 rounded-lg border text-left transition ${isSlotSelected
                          ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800'
                          }`}
                      >
                        <p className={`text-xs font-semibold ${isSlotSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                          {s.date}
                        </p>
                        <p className="text-sm font-bold mt-0.5">
                          {s.startTime} - {s.endTime}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Reason for Consultation / Symptoms (Optional)
                </label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Follow-up consultation for mild headache, rash on right arm..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {selectedSlot && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900">
                  <p className="font-bold text-sm mb-1">ing Summary:</p>
                  <p>• Doctor: <strong>{selectedDoctor.userId?.name}</strong> ({selectedDoctor.specialization})</p>
                  <p>• Scheduled Slot: <strong>{selectedSlot.date} at {selectedSlot.startTime} - {selectedSlot.endTime}</strong></p>
                  <p>• Consultation Mode: <strong>Jitsi Secure Telehealth Video</strong></p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Confirming ing...' : 'Confirm Appointment'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
