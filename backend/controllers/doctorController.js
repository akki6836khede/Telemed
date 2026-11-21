import Doctor from '../models/Doctor.js';

// @desc    Get all verified doctors (for patient booking)
// @route   GET /api/doctors
// @access  Public / Authenticated
export const getVerifiedDoctors = async (req, res, next) => {
  try {
    const { specialization, hospital } = req.query;
    const filter = { verified: true };

    if (specialization) {
      filter.specialization = new RegExp(specialization, 'i');
    }
    if (hospital) {
      filter.hospital = new RegExp(hospital, 'i');
    }

    const doctors = await Doctor.find(filter)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor details by ID
// @route   GET /api/doctors/:id
// @access  Public / Authenticated
export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      'userId',
      'name email phone'
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    return res.json({
      success: true,
      doctor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in doctor's profile
// @route   GET /api/doctors/me/profile
// @access  Private (Doctor)
export const getMyDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone'
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found.'
      });
    }

    return res.json({
      success: true,
      doctor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add availability slot
// @route   POST /api/doctors/slots
// @access  Private (Verified Doctor)
export const addSlot = async (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Date, startTime, and endTime are required.'
      });
    }

    const doctor = req.doctor; // attached by requireVerifiedDoctor

    // Check for duplicate slot
    const exists = doctor.slots.some(
      (s) => s.date === date && s.startTime === startTime
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'A slot for this date and time already exists.'
      });
    }

    doctor.slots.push({ date, startTime, endTime, isBooked: false });
    await doctor.save();

    return res.status(201).json({
      success: true,
      message: 'Slot added successfully.',
      slots: doctor.slots
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an availability slot
// @route   DELETE /api/doctors/slots/:slotId
// @access  Private (Verified Doctor)
export const deleteSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const doctor = req.doctor;

    const slotIndex = doctor.slots.findIndex((s) => s._id.toString() === slotId);
    if (slotIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found.'
      });
    }

    if (doctor.slots[slotIndex].isBooked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a slot that is already booked.'
      });
    }

    doctor.slots.splice(slotIndex, 1);
    await doctor.save();

    return res.json({
      success: true,
      message: 'Slot removed successfully.',
      slots: doctor.slots
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get slots for a doctor (public / patient booking)
// @route   GET /api/doctors/:id/slots
// @access  Public / Authenticated
export const getDoctorSlots = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    return res.json({
      success: true,
      slots: doctor.slots
    });
  } catch (error) {
    next(error);
  }
};
