import express from 'express';
import {
  getMyProfile,
  updateMyProfile,
  lookupPatientById
} from '../controllers/patientController.js';
import { getPatientTimeline } from '../controllers/visitController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Current patient profile routes
router.get('/me', verifyToken, requireRole('patient'), getMyProfile);
router.put('/me', verifyToken, requireRole('patient'), updateMyProfile);
router.get('/me/timeline', verifyToken, requireRole('patient'), getPatientTimeline);

// Patient ID lookup for Lab Techs, Doctors, and Admin
router.get(
  '/lookup/:patientId',
  verifyToken,
  requireRole('doctor', 'lab', 'admin'),
  lookupPatientById
);

export default router;
