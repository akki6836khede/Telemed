import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Video, ArrowLeft, Shield, Clock, PhoneOff } from 'lucide-react';

export const TelehealthSession = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/appointments/${appointmentId}/meeting`);
        if (res.data.success) {
          setAppointment(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to access video consultation room.');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [appointmentId]);

  // Initialize Jitsi Iframe API once meeting details are loaded
  useEffect(() => {
    if (!appointment || !jitsiContainerRef.current) return;

    // Check if Jitsi API script is loaded
    if (window.JitsiMeetExternalAPI) {
      const domain = 'meet.jit.si';
      const options = {
        roomName: appointment.meetingRoom,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: `${user?.name || 'User'} (${user?.role})`
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'chat',
            'raisehand',
            'tileview'
          ]
        }
      };

      try {
        const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = apiInstance;

        apiInstance.addEventListeners({
          readyToClose: () => {
            navigate(-1);
          }
        });
      } catch (e) {
        console.error('Failed to initialize Jitsi API:', e);
      }
    } else {
      console.warn('Jitsi external API not loaded on window');
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [appointment, user, navigate]);

  const handleLeaveCall = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    navigate(-1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* Top Session Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveCall}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Leave Consultation"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-teal-600" />
              Telehealth Video Consultation
            </h1>
            <p className="text-xs text-slate-500">
              Doctor: <strong>{appointment?.doctorName}</strong> • Patient: <strong>{appointment?.patientName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" /> End-to-End Encrypted Room
          </div>
          <button
            onClick={handleLeaveCall}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <PhoneOff className="w-3.5 h-3.5" /> Leave Room
          </button>
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {/* Video Container */}
      <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden shadow-inner relative flex items-center justify-center">
        {loading ? (
          <LoadingSpinner message="Connecting to encrypted telehealth room..." />
        ) : error ? (
          <div className="text-center p-8 text-white max-w-md">
            <Video className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold">Room Unavailable</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
            >
              Return to Appointments
            </button>
          </div>
        ) : (
          <div ref={jitsiContainerRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};
