import Visit from '../models/Visit.js';
import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { checkAllergies } from '../utils/allergyChecker.js';

// @desc    Create visit notes & prescription
// @route   POST /api/visits
// @access  Private (Verified Doctor)
export const createVisit = async (req, res, next) => {
  try {
    const { appointmentId, diagnosis, notes, medicines, followUpDate, overrideAllergyWarning } = req.body;

    if (!appointmentId || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and diagnosis are required.'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor || !doctor.verified) {
      return res.status(403).json({
        success: false,
        message: 'Only verified doctors can record visit notes.'
      });
    }

    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    if (appointment.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to write notes for this appointment.'
      });
    }

    // Check allergies against patient's profile
    const patientAllergies = appointment.patientId?.allergies || [];
    const allergyWarnings = checkAllergies(medicines || [], patientAllergies);

    // If allergy warnings exist and doctor hasn't explicitly acknowledged override
    if (allergyWarnings.length > 0 && !overrideAllergyWarning) {
      return res.status(409).json({
        success: false,
        isAllergyConflict: true,
        message: 'Allergy Conflict Detected. Please review warnings or confirm override.',
        warnings: allergyWarnings
      });
    }

    // Create or update visit
    let visit = await Visit.findOne({ appointmentId });
    if (visit) {
      visit.diagnosis = diagnosis;
      visit.notes = notes || '';
      await visit.save();
    } else {
      visit = await Visit.create({
        appointmentId,
        diagnosis,
        notes: notes || ''
      });
    }

    // Create or update prescription
    let prescription = await Prescription.findOne({ visitId: visit._id });
    if (prescription) {
      prescription.medicines = medicines || [];
      prescription.followUpDate = followUpDate ? new Date(followUpDate) : null;
      await prescription.save();
    } else {
      prescription = await Prescription.create({
        visitId: visit._id,
        medicines: medicines || [],
        followUpDate: followUpDate ? new Date(followUpDate) : null
      });
    }

    // Mark appointment as Completed
    appointment.status = 'Completed';
    await appointment.save();

    return res.status(201).json({
      success: true,
      message: 'Visit notes and prescription recorded successfully.',
      visit,
      prescription,
      allergyWarnings: allergyWarnings.length > 0 ? allergyWarnings : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live check of medicines against patient allergies
// @route   POST /api/visits/check-allergies
// @access  Private (Doctor)
export const checkAllergiesLive = async (req, res, next) => {
  try {
    const { appointmentId, medicines } = req.body;

    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    const patientAllergies = appointment.patientId?.allergies || [];
    const warnings = checkAllergies(medicines || [], patientAllergies);

    return res.json({
      success: true,
      hasWarnings: warnings.length > 0,
      warnings,
      patientAllergies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get visit and prescription for an appointment
// @route   GET /api/visits/appointment/:appointmentId
// @access  Private (Patient or Doctor)
export const getVisitByAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const visit = await Visit.findOne({ appointmentId });
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'No clinical notes recorded yet for this appointment.'
      });
    }

    const prescription = await Prescription.findOne({ visitId: visit._id });

    return res.json({
      success: true,
      visit,
      prescription
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient medical history timeline
// @route   GET /api/patients/me/timeline
// @access  Private (Patient)
export const getPatientTimeline = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    // Find all completed appointments for this patient
    const appointments = await Appointment.find({
      patientId: patient._id,
      status: 'Completed'
    })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ dateTime: -1 });

    const timeline = [];

    for (const appt of appointments) {
      const visit = await Visit.findOne({ appointmentId: appt._id });
      if (visit) {
        const prescription = await Prescription.findOne({ visitId: visit._id });
        timeline.push({
          appointmentId: appt._id,
          date: appt.dateTime,
          doctorName: appt.doctorId?.userId?.name || 'Doctor',
          hospital: appt.doctorId?.hospital || 'Hospital',
          specialization: appt.doctorId?.specialization || 'Medicine',
          diagnosis: visit.diagnosis,
          notes: visit.notes,
          prescription: prescription ? prescription.medicines : [],
          followUpDate: prescription?.followUpDate || null
        });
      }
    }

    return res.json({
      success: true,
      count: timeline.length,
      timeline
    });
  } catch (error) {
    next(error);
  }
};
