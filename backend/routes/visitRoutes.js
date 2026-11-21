import express from 'express';
import {
  createVisit,
  checkAllergiesLive,
  getVisitByAppointment,
  getPatientTimeline
} from '../controllers/visitController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

// Doctor clinical notes & allergy checks
router.post('/', requireRole('doctor'), createVisit);
router.post('/check-allergies', requireRole('doctor'), checkAllergiesLive);
router.get('/appointment/:appointmentId', requireRole('doctor', 'patient'), getVisitByAppointment);

export default router;
