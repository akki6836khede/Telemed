import { v4 as uuidv4 } from 'uuid';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Visit from '../models/Visit.js';
import Prescription from '../models/Prescription.js';

// @desc    Get patient's emergency card metadata
// @route   GET /api/emergency/card
// @access  Private (Patient)
export const getEmergencyCard = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate('userId', 'name phone');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const publicUrl = `${clientUrl}/emergency/${patient.emergencyToken}`;

    return res.json({
      success: true,
      card: {
        emergencyToken: patient.emergencyToken,
        isEnabled: patient.emergencyCardEnabled,
        publicUrl,
        patientName: patient.userId?.name,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        patientId: patient.patientId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate emergency card token (invalidates previous QR codes)
// @route   POST /api/emergency/regenerate
// @access  Private (Patient)
export const regenerateEmergencyToken = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    patient.emergencyToken = uuidv4();
    await patient.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const publicUrl = `${clientUrl}/emergency/${patient.emergencyToken}`;

    return res.json({
      success: true,
      message: 'New emergency security token generated. Any previously printed QR codes are now invalidated.',
      emergencyToken: patient.emergencyToken,
      publicUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle emergency card active status (enable/disable)
// @route   PATCH /api/emergency/toggle
// @access  Private (Patient)
export const toggleEmergencyCard = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    patient.emergencyCardEnabled = typeof enabled === 'boolean' ? enabled : !patient.emergencyCardEnabled;
    await patient.save();

    return res.json({
      success: true,
      message: `Emergency QR card has been ${patient.emergencyCardEnabled ? 'enabled' : 'disabled'}.`,
      isEnabled: patient.emergencyCardEnabled
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public read-only minimal emergency triage summary (DPDP Act minimal data)
// @route   GET /api/emergency/public/:token
// @access  Public
export const getPublicEmergencySummary = async (req, res, next) => {
  try {
    const { token } = req.params;

    const patient = await Patient.findOne({ emergencyToken: token }).populate('userId', 'name phone');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired Emergency Card token.'
      });
    }

    if (!patient.emergencyCardEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Emergency Card access has been temporarily disabled by the patient.'
      });
    }

    // Retrieve active current medications from latest completed prescription
    const latestAppointment = await Appointment.findOne({
      patientId: patient._id,
      status: 'Completed'
    }).sort({ dateTime: -1 });

    let activeMedicines = [];
    if (latestAppointment) {
      const visit = await Visit.findOne({ appointmentId: latestAppointment._id });
      if (visit) {
        const rx = await Prescription.findOne({ visitId: visit._id });
        if (rx) {
          activeMedicines = rx.medicines || [];
        }
      }
    }

    // Strict DPDP Minimal Disclosure: Return ONLY life-critical emergency medical information
    return res.json({
      success: true,
      emergencySummary: {
        patientId: patient.patientId,
        patientName: patient.userId?.name,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        currentMedications: activeMedicines.map((m) => ({ name: m.name, dosage: m.dosage })),
        emergencyContactPhone: patient.userId?.phone,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};
