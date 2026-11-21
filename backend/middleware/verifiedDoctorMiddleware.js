import Doctor from '../models/Doctor.js';

export const requireVerifiedDoctor = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to doctors only.'
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found.'
      });
    }

    if (!doctor.verified) {
      return res.status(403).json({
        success: false,
        message: 'Your doctor account is pending Administrator verification. Clinical actions are disabled until approved.'
      });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    next(error);
  }
};
