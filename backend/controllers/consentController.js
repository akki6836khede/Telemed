import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ConsentOTP from '../models/ConsentOTP.js';
import AccessLog from '../models/AccessLog.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Visit from '../models/Visit.js';
import Prescription from '../models/Prescription.js';
import Report from '../models/Report.js';
import { sendConsentOTPEmail } from '../utils/emailService.js';

// @desc    Doctor requests OTP consent from patient
// @route   POST /api/consent/request-otp
// @access  Private (Verified Doctor)
export const requestOTP = async (req, res, next) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required.'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!doctor || !doctor.verified) {
      return res.status(403).json({
        success: false,
        message: 'Only verified doctors can request record access consent.'
      });
    }

    const patient = await Patient.findOne({
      patientId: patientId.toUpperCase().trim()
    }).populate('userId', 'name phone email');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `No patient found with ID: ${patientId}`
      });
    }

    // Generate secure 6-digit random number
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(8);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Upsert or create consent OTP request
    await ConsentOTP.findOneAndUpdate(
      { patientId: patient._id, doctorId: doctor._id },
      {
        otpHash,
        attempts: 0,
        expiresAt,
        approved: false,
        approvedUntil: null
      },
      { upsert: true, new: true }
    );

    // Deliver OTP via Email (falls back to console if SMTP not configured)
    const emailResult = await sendConsentOTPEmail({
      toEmail: patient.userId?.email,
      patientName: patient.userId?.name,
      otp,
      doctorName: doctor.userId?.name || 'Practicing Doctor',
      doctorSpecialization: doctor.specialization,
      hospital: doctor.hospital,
      expiresInMinutes: 5
    });

    return res.json({
      success: true,
      message: `A 6-digit OTP consent request has been sent to ${patient.userId?.email ? `${patient.userId.name} (${patient.userId.email})` : patient.userId?.name}.`,
      delivery: {
        channel: 'email',
        emailSent: emailResult?.sent || false,
        simulated: emailResult?.simulated || false
      },
      patient: {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.userId?.name
      },
      // Only show simulated OTP if email was NOT sent and demo OTP is not explicitly disabled
      simulatedOTP: (process.env.NODE_ENV !== 'production' && !emailResult?.sent && process.env.DISABLE_DEMO_OTP !== 'true') ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor verifies OTP provided by patient
// @route   POST /api/consent/verify-otp
// @access  Private (Verified Doctor)
export const verifyOTP = async (req, res, next) => {
  try {
    const { patientId, otp } = req.body;

    if (!patientId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and OTP are required.'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor || !doctor.verified) {
      return res.status(403).json({ success: false, message: 'Doctor verification required.' });
    }

    const patient = await Patient.findOne({ patientId: patientId.toUpperCase().trim() });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const consentRecord = await ConsentOTP.findOne({
      patientId: patient._id,
      doctorId: doctor._id
    });

    if (!consentRecord) {
      return res.status(404).json({
        success: false,
        message: 'No active consent request found. Please request an OTP first.'
      });
    }

    // Check expiry
    if (new Date() > consentRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Consent OTP has expired. Please request a new one.'
      });
    }

    // Check rate limit (max 3 failed attempts)
    if (consentRecord.attempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP.'
      });
    }

    // Compare hash
    const isMatch = await bcrypt.compare(otp.trim(), consentRecord.otpHash);
    if (!isMatch) {
      consentRecord.attempts += 1;
      await consentRecord.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${3 - consentRecord.attempts} attempt(s) remaining.`
      });
    }

    // Grant 30 minutes time-bounded consent access
    const approvedUntil = new Date(Date.now() + 30 * 60 * 1000);
    consentRecord.approved = true;
    consentRecord.approvedUntil = approvedUntil;
    await consentRecord.save();

    // Log the access initialization in AccessLog
    await AccessLog.create({
      doctorId: doctor._id,
      patientId: patient._id,
      action: 'LOOKUP_BASIC_PROFILE'
    });

    return res.json({
      success: true,
      message: 'OTP verified successfully. Consent granted for 30 minutes.',
      approvedUntil
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patient views pending consent requests on their dashboard
// @route   GET /api/consent/pending
// @access  Private (Patient)
export const getPendingConsentRequests = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const pending = await ConsentOTP.find({
      patientId: patient._id,
      approved: false,
      expiresAt: { $gt: new Date() }
    }).populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name email phone' }
    });

    return res.json({
      success: true,
      count: pending.length,
      pending
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patient approves pending consent request directly from dashboard
// @route   POST /api/consent/approve-online
// @access  Private (Patient)
export const approveOnline = async (req, res, next) => {
  try {
    const { consentId } = req.body;

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const consent = await ConsentOTP.findOne({ _id: consentId, patientId: patient._id });
    if (!consent) {
      return res.status(404).json({ success: false, message: 'Consent request not found.' });
    }

    consent.approved = true;
    consent.approvedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await consent.save();

    return res.json({
      success: true,
      message: 'Consent approved. Doctor now has 30 minutes of clinical access.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patient denies pending consent request
// @route   POST /api/consent/deny-online
// @access  Private (Patient)
export const denyOnline = async (req, res, next) => {
  try {
    const { consentId } = req.body;

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    await ConsentOTP.findOneAndDelete({ _id: consentId, patientId: patient._id });

    return res.json({
      success: true,
      message: 'Consent request denied and dismissed.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor queries patient medical history with active consent
// @route   GET /api/consent/patient/:patientId/history
// @access  Private (Doctor with active consent)
export const getConsentedPatientHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor || !doctor.verified) {
      return res.status(403).json({ success: false, message: 'Doctor verification required.' });
    }

    const patient = await Patient.findOne({ patientId: patientId.toUpperCase().trim() });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Verify active unexpired consent
    const consent = await ConsentOTP.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      approved: true,
      approvedUntil: { $gt: new Date() }
    });

    if (!consent) {
      return res.status(403).json({
        success: false,
        message: 'Consent required. You must request and obtain patient OTP consent before viewing medical records.'
      });
    }

    // Log the access under DPDP Act requirements
    await AccessLog.create({
      doctorId: doctor._id,
      patientId: patient._id,
      action: 'VIEW_MEDICAL_HISTORY'
    });

    // Fetch history
    const appointments = await Appointment.find({
      patientId: patient._id,
      status: 'Completed'
    })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ dateTime: -1 });

    const timeline = [];
    for (const appt of appointments) {
      const visit = await Visit.findOne({ appointmentId: appt._id });
      if (visit) {
        const prescription = await Prescription.findOne({ visitId: visit._id });
        timeline.push({
          date: appt.dateTime,
          doctorName: appt.doctorId?.userId?.name || 'Doctor',
          hospital: appt.doctorId?.hospital,
          diagnosis: visit.diagnosis,
          notes: visit.notes,
          prescription: prescription ? prescription.medicines : []
        });
      }
    }

    return res.json({
      success: true,
      consentValidUntil: consent.approvedUntil,
      patient: {
        name: patient.name,
        patientId: patient.patientId,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies
      },
      timeline
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor queries patient reports with active consent
// @route   GET /api/consent/patient/:patientId/reports
// @access  Private (Doctor with active consent)
export const getConsentedPatientReports = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor || !doctor.verified) {
      return res.status(403).json({ success: false, message: 'Doctor verification required.' });
    }

    const patient = await Patient.findOne({ patientId: patientId.toUpperCase().trim() });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const consent = await ConsentOTP.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      approved: true,
      approvedUntil: { $gt: new Date() }
    });

    if (!consent) {
      return res.status(403).json({
        success: false,
        message: 'Consent required. You must request and obtain patient OTP consent before viewing medical reports.'
      });
    }

    // Log the access
    await AccessLog.create({
      doctorId: doctor._id,
      patientId: patient._id,
      action: 'VIEW_LAB_REPORTS'
    });

    const reports = await Report.find({ patientId: patient._id })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      consentValidUntil: consent.approvedUntil,
      reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patient views audit access logs ("Who viewed my records")
// @route   GET /api/consent/access-logs
// @access  Private (Patient)
export const getPatientAccessLogs = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const logs = await AccessLog.find({ patientId: patient._id })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .sort({ time: -1 });

    return res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};
