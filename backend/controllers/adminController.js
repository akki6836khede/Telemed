import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

// @desc    Get all doctors with verification status
// @route   GET /api/admin/doctors
// @access  Private (Admin)
export const getAllDoctors = async (req, res, next) => {
  try {
    const { verified } = req.query;
    const filter = {};
    if (verified !== undefined) {
      filter.verified = verified === 'true';
    }

    const doctors = await Doctor.find(filter)
      .populate('userId', 'name email phone createdAt')
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

// @desc    Approve or reject doctor verification
// @route   PATCH /api/admin/doctors/:id/verify
// @access  Private (Admin)
export const verifyDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "verified" must be a boolean (true or false).'
      });
    }

    const doctor = await Doctor.findById(id).populate('userId', 'name email');
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    doctor.verified = verified;
    await doctor.save();

    return res.json({
      success: true,
      message: `Doctor ${doctor.userId?.name || ''} has been ${verified ? 'verified and approved' : 'marked as unverified'}.`,
      doctor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (with optional role filter)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    const verifiedDoctors = await Doctor.countDocuments({ verified: true });
    const pendingDoctors = await Doctor.countDocuments({ verified: false });
    const totalUsers = await User.countDocuments();

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        verifiedDoctors,
        pendingDoctors
      }
    });
  } catch (error) {
    next(error);
  }
};
