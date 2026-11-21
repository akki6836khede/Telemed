import express from 'express';
import {
  getEmergencyCard,
  regenerateEmergencyToken,
  toggleEmergencyCard,
  getPublicEmergencySummary
} from '../controllers/emergencyController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Emergency Triage Route
router.get('/public/:token', getPublicEmergencySummary);

// Protected Patient Management Routes
router.get('/card', verifyToken, requireRole('patient'), getEmergencyCard);
router.post('/regenerate', verifyToken, requireRole('patient'), regenerateEmergencyToken);
router.patch('/toggle', verifyToken, requireRole('patient'), toggleEmergencyCard);

export default router;
