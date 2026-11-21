import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Clock, Calendar, Stethoscope, Pill, Hospital, CheckCircle2 } from 'lucide-react';

export const MyHistory = () => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await api.get('/patients/me/timeline');
        if (res.data.success) {
          setTimeline(res.data.timeline || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load medical history timeline.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-7 h-7 text-emerald-600" /> Medical History Timeline
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          A continuous, chronological record of your clinical diagnoses, consulting doctors, and issued prescriptions.
        </p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <LoadingSpinner message="Retrieving your medical history..." />
      ) : timeline.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No past medical consultations</p>
          <p className="text-xs text-slate-500 mt-1">
            Once you complete a consultation with a doctor, your diagnosis and prescription will appear here.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-teal-200 ml-4 md:ml-6 space-y-8 pb-8">
          {timeline.map((item, idx) => {
            const dateStr = new Date(item.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return (
              <div key={idx} className="relative pl-6 md:pl-8">
                {/* Timeline node icon */}
                <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center ring-4 ring-slate-50 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                        {dateStr}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {item.diagnosis}
                      </h2>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-slate-800 flex items-center sm:justify-end gap-1">
                        <Stethoscope className="w-4 h-4 text-teal-600" /> {item.doctorName}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center sm:justify-end gap-1">
                        <Hospital className="w-3.5 h-3.5" /> {item.hospital} ({item.specialization})
                      </p>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mb-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">Doctor's Clinical Notes:</span> {item.notes}
                    </div>
                  )}

                  {/* Prescribed Medicines */}
                  {item.prescription && item.prescription.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-emerald-600" /> Prescribed Medications
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                            <tr>
                              <th className="py-2 px-3">Medicine</th>
                              <th className="py-2 px-3">Dosage Instruction</th>
                              <th className="py-2 px-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {item.prescription.map((med, mIdx) => (
                              <tr key={mIdx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-semibold text-slate-900">{med.name}</td>
                                <td className="py-2 px-3 text-slate-600">{med.dosage}</td>
                                <td className="py-2 px-3 text-slate-500">{med.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {item.followUpDate && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> Recommended Follow-Up: {new Date(item.followUpDate).toLocaleDateString()}
                    </div>
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
