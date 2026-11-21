import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Auth Pages
import { Login } from './pages/auth/Login';
import { RegisterPatient } from './pages/auth/RegisterPatient';
import { RegisterDoctor } from './pages/auth/RegisterDoctor';

// Dashboards
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LabDashboard } from './pages/lab/LabDashboard';

// Appointments & Slots
import { BookAppointment } from './pages/patient/BookAppointment';
import { ManageSlots } from './pages/doctor/ManageSlots';
import { MyAppointments } from './pages/shared/MyAppointments';

// Visits, History & Allergies
import { WriteVisit } from './pages/doctor/WriteVisit';
import { MyHistory } from './pages/patient/MyHistory';

// Lab Reports
import { MyReports } from './pages/patient/MyReports';

// DPDP Consent & Access Logs
import { PatientLookup } from './pages/doctor/PatientLookup';
import { AccessLogs } from './pages/patient/AccessLogs';

// Telehealth Video & Emergency QR
import { TelehealthSession } from './pages/shared/TelehealthSession';
import { EmergencyCardView } from './pages/patient/EmergencyCardView';
import { EmergencyPublicView } from './pages/shared/EmergencyPublicView';
import { EmergencyScanPage } from './pages/shared/EmergencyScanPage';

// Home Redirect Component
const HomeRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const routes = {
    patient: '/patient/dashboard',
    doctor: '/doctor/dashboard',
    admin: '/admin/dashboard',
    lab: '/lab/dashboard'
  };
  return <Navigate to={routes[user?.role] || '/login'} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register/patient" element={<RegisterPatient />} />
              <Route path="/register/doctor" element={<RegisterDoctor />} />
              <Route path="/emergency/scan" element={<EmergencyScanPage />} />
              <Route path="/emergency/:token" element={<EmergencyPublicView />} />

              {/* Patient Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
                <Route path="/patient/dashboard" element={<PatientDashboard />} />
                <Route path="/patient/book-appointment" element={<BookAppointment />} />
                <Route path="/patient/appointments" element={<MyAppointments />} />
                <Route path="/patient/reports" element={<MyReports />} />
                <Route path="/patient/history" element={<MyHistory />} />
                <Route path="/patient/access-logs" element={<AccessLogs />} />
                <Route path="/patient/emergency-card" element={<EmergencyCardView />} />
              </Route>

              {/* Doctor Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/slots" element={<ManageSlots />} />
                <Route path="/doctor/appointments" element={<MyAppointments />} />
                <Route path="/doctor/visit/:appointmentId" element={<WriteVisit />} />
                <Route path="/doctor/lookup" element={<PatientLookup />} />
              </Route>

              {/* Shared Protected Telehealth Video Session */}
              <Route element={<ProtectedRoute allowedRoles={['patient', 'doctor']} />}>
                <Route path="/telehealth/:appointmentId" element={<TelehealthSession />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>

              {/* Lab Technician Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['lab']} />}>
                <Route path="/lab/dashboard" element={<LabDashboard />} />
                <Route path="/lab/upload" element={<LabDashboard />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
