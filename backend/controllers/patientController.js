import Patient from '../models/Patient.js';
import User from '../models/User.js';

// @desc    Get current patient's profile
// @route   GET /api/patients/me
// @access  Private (Patient)
export const getMyProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone'
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.'
      });
    }

    return res.json({
      success: true,
      patient
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current patient's profile
// @route   PUT /api/patients/me
// @access  Private (Patient)
export const updateMyProfile = async (req, res, next) => {
  try {
    const { bloodGroup, allergies, abhaId, phone } = req.body;

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.'
      });
    }

    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (allergies !== undefined) {
      patient.allergies = Array.isArray(allergies)
        ? allergies
        : allergies.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (abhaId !== undefined) patient.abhaId = abhaId;
    await patient.save();

    if (phone) {
      await User.findByIdAndUpdate(req.user._id, { phone });
    }

    const updated = await Patient.findById(patient._id).populate('userId', 'name email phone');

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      patient: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Basic lookup by Patient ID (for Lab Tech upload & Doctor consultation)
// @route   GET /api/patients/lookup/:patientId
// @access  Private (Lab, Doctor, Admin)
export const lookupPatientById = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({
      patientId: patientId.toUpperCase().trim()
    }).populate('userId', 'name email phone');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `No patient found with ID: ${patientId}`
      });
    }

    // Return sanitized basic clinical info
    return res.json({
      success: true,
      patient: {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.userId?.name,
        dob: patient.dob,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        abhaId: patient.abhaId
      }
    });
  } catch (error) {
    next(error);
  }
};
