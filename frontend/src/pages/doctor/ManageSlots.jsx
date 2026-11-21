import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Calendar, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';

export const ManageSlots = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors/me/profile');
      if (res.data.success) {
        setSlots(res.data.doctor.slots || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await api.post('/doctors/slots', { date, startTime, endTime });
      setSuccessMsg('Consultation slot added successfully.');
      setSlots(res.data.slots);
      // Reset times for convenience
      setDate('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.delete(`/doctors/slots/${slotId}`);
      setSuccessMsg('Slot deleted successfully.');
      setSlots(res.data.slots);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete slot.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-sky-600" /> Manage Availability Slots
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Define your working consultation slots so patients can book telehealth appointments with you.
        </p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg('')} />

      {/* Add Slot Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-sky-600" /> Add New Consultation Slot
        </h2>
        <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Start Time *</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">End Time *</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Saving...' : 'Add Slot'}
          </button>
        </form>
      </div>

      {/* Slots List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">Your Active Availability Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">Slots marked in green are open for patient booking.</p>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your schedule..." />
        ) : slots.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No slots added yet. Use the form above to add your first slot.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slots.map((slot) => (
              <div key={slot._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                    {slot.date.slice(5)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {slot.date} • {slot.startTime} - {slot.endTime}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      {slot.isBooked ? (
                        <span className="text-amber-600 font-semibold">● Booked by Patient</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Available for Booking
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!slot.isBooked && (
                  <button
                    onClick={() => handleDeleteSlot(slot._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Remove Slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
