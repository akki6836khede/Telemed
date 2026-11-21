import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import { generateToken } from '../utils/token.js';
import { getNextPatientId } from '../utils/generatePatientId.js';

// @desc    Register a new patient
// @route   POST /api/auth/register-patient
// @access  Public
export const registerPatient = async (req, res, next) => {
  try {
    const { name, email, phone, password, dob, gender, bloodGroup, allergies, abhaId } = req.body;

    if (!name || !email || !phone || !password || !dob || !gender || !bloodGroup) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, phone, password, dob, gender, bloodGroup).'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: 'patient'
    });

    // Generate formatted auto-incrementing Patient ID (PT-000123)
    const patientId = await getNextPatientId();

    const patient = await Patient.create({
      userId: user._id,
      patientId,
      dob: new Date(dob),
      gender,
      bloodGroup,
      allergies: Array.isArray(allergies) ? allergies : allergies ? allergies.split(',').map(s => s.trim()) : [],
      abhaId: abhaId || ''
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        patientProfile: patient
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new doctor (pending admin verification)
// @route   POST /api/auth/register-doctor
// @access  Public
export const registerDoctor = async (req, res, next) => {
  try {
    const { name, email, phone, password, specialization, hospital } = req.body;

    if (!name || !email || !phone || !password || !specialization || !hospital) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, phone, password, specialization, hospital).'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: 'doctor'
    });

    const doctor = await Doctor.create({
      userId: user._id,
      specialization,
      hospital,
      verified: false
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: 'Doctor registered successfully. Account is pending Admin verification.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        doctorProfile: doctor
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ userId: user._id });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ userId: user._id });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'patient') {
      profile = await Patient.findOne({ userId: req.user._id });
    } else if (req.user.role === 'doctor') {
      profile = await Doctor.findOne({ userId: req.user._id });
    }

    return res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        createdAt: req.user.createdAt,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};
