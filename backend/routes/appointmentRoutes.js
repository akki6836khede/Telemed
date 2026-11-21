import express from 'express';
import {
  bookAppointment,
  getMyAppointments,
  updateAppointmentStatus,
  getMeetingLink
} from '../controllers/appointmentController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/book', requireRole('patient'), bookAppointment);
router.get('/my', requireRole('patient', 'doctor'), getMyAppointments);
router.patch('/:id/status', requireRole('patient', 'doctor'), updateAppointmentStatus);
router.get('/:id/meeting', requireRole('patient', 'doctor'), getMeetingLink);

export default router;
