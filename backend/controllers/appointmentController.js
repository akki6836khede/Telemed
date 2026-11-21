import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// @desc    Book an appointment
// @route   POST /api/appointments/book
// @access  Private (Patient)
export const bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, dateTime, slotId, notes } = req.body;

    if (!doctorId || !dateTime) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and dateTime are required.'
      });
    }

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.'
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.verified) {
      return res.status(400).json({
        success: false,
        message: 'The selected doctor is not verified or unavailable.'
      });
    }

    const targetDate = new Date(dateTime);

    // Concurrency Check 1: Check existing active appointments for doctor at this time
    const existingActive = await Appointment.findOne({
      doctorId,
      dateTime: targetDate,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This slot has already been booked. Please choose another time.'
      });
    }

    // Atomic insert guarded by MongoDB unique partial index
    let appointment;
    try {
      appointment = await Appointment.create({
        patientId: patient._id,
        doctorId: doctor._id,
        dateTime: targetDate,
        status: 'Pending',
        notes: notes || ''
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Conflict: Slot was booked simultaneously by another patient. Please pick another slot.'
        });
      }
      throw err;
    }

    // Mark slot as booked on doctor profile if slotId was provided
    if (slotId) {
      await Doctor.updateOne(
        { _id: doctorId, 'slots._id': slotId },
        { $set: { 'slots.$.isBooked': true } }
      );
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully. Awaiting doctor confirmation.',
      appointment: populatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get appointments for logged-in user (patient or doctor)
// @route   GET /api/appointments/my
// @access  Private (Patient / Doctor)
export const getMyAppointments = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
      filter.patientId = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      filter.doctorId = doctor._id;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const appointments = await Appointment.find(filter)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .sort({ dateTime: -1 });

    return res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PATCH /api/appointments/:id/status
// @access  Private (Doctor or Patient)
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Role-specific authorization checks
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized.' });
      }
      // Patients can only cancel their appointment
      if (status !== 'Cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Patients may only cancel appointments.'
        });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized.' });
      }
    }

    appointment.status = status;
    await appointment.save();

    // If cancelled, free up the slot on doctor profile if applicable
    if (status === 'Cancelled') {
      const apptDateStr = new Date(appointment.dateTime).toISOString().split('T')[0];
      await Doctor.updateOne(
        { _id: appointment.doctorId, 'slots.date': apptDateStr },
        { $set: { 'slots.$.isBooked': false } }
      );
    }

    return res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get video consultation meeting link
// @route   GET /api/appointments/:id/meeting
// @access  Private (Participant Patient or Doctor)
export const getMeetingLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Verify user is a participant
    let isAuthorized = false;
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (patient && appointment.patientId._id.toString() === patient._id.toString()) {
        isAuthorized = true;
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor && appointment.doctorId._id.toString() === doctor._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this consultation.'
      });
    }

    if (appointment.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: `Meeting room is not accessible. Current appointment status is "${appointment.status}". It must be "Confirmed".`
      });
    }

    return res.json({
      success: true,
      meetingRoom: appointment.meetingRoom,
      meetingLink: appointment.meetingLink,
      dateTime: appointment.dateTime,
      doctorName: appointment.doctorId?.userId?.name,
      patientName: appointment.patientId?.userId?.name
    });
  } catch (error) {
    next(error);
  }
};
