import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Calendar, Video, Clock, Check, X, FileText, User, Stethoscope } from 'lucide-react';

export const MyAppointments = () => {
  const { user, role } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data.success) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusChange = async (appointmentId, newStatus) => {
    setError('');
    setSuccess('');
    setActionLoadingId(appointmentId);
    try {
      const res = await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      setSuccess(`Appointment status updated to ${newStatus}.`);
      setAppointments((prev) =>
        prev.map((a) => (a._id === appointmentId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Confirmed</span>;
      case 'Pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pending</span>;
      case 'Completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Completed</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-teal-600" /> Consultations & Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track scheduled sessions, manage status, and connect to live telehealth video rooms.
          </p>
        </div>

        {role === 'patient' && (
          <Link
            to="/patient/book-appointment"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> Book New Slot
          </Link>
        )}
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner message="Loading your appointments..." />
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No appointments scheduled</p>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'patient'
              ? 'Click "Book New Slot" above to schedule a consultation with a verified doctor.'
              : 'When patients book your slots, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const isDoctor = role === 'doctor';
            const counterPartyName = isDoctor
              ? appt.patientId?.userId?.name || 'Patient'
              : appt.doctorId?.userId?.name || 'Doctor';
            const counterPartySub = isDoctor
              ? `Blood: ${appt.patientId?.bloodGroup || 'N/A'} • ID: ${appt.patientId?.patientId || ''}`
              : `${appt.doctorId?.specialization || 'Physician'} • ${appt.doctorId?.hospital || ''}`;

            const dateStr = new Date(appt.dateTime).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const timeStr = new Date(appt.dateTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={appt._id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex flex-col items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 mb-0.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(appt.status)}
                      <span className="text-xs text-slate-400">Ref: {appt._id.slice(-6)}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      {isDoctor ? <User className="w-4 h-4 text-slate-400" /> : <Stethoscope className="w-4 h-4 text-teal-600" />}
                      {counterPartyName}
                    </h3>
                    <p className="text-xs text-slate-500">{counterPartySub}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-2">
                      📅 {dateStr} at {timeStr}
                    </p>
                    {appt.notes && (
                      <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">
                        Notes: "{appt.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Video Room Button (Enabled when Confirmed) */}
                  {appt.status === 'Confirmed' && (
                    <Link
                      to={`/telehealth/${appt._id}`}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Video className="w-4 h-4" /> Join Video Room
                    </Link>
                  )}

                  {/* Doctor Actions */}
                  {isDoctor && appt.status === 'Pending' && (
                    <button
                      onClick={() => handleStatusChange(appt._id, 'Confirmed')}
                      disabled={actionLoadingId === appt._id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm
                    </button>
                  )}

                  {/* Doctor Write Visit Notes & Prescribe */}
                  {isDoctor && (appt.status === 'Confirmed' || appt.status === 'Completed') && (
                    <Link
                      to={`/doctor/visit/${appt._id}`}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Visit & Rx
                    </Link>
                  )}

                  {/* Cancellation */}
                  {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                    <button
                      onClick={() => handleStatusChange(appt._id, 'Cancelled')}
                      disabled={actionLoadingId === appt._id}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
