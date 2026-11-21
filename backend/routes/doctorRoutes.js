import express from 'express';
import {
  getVerifiedDoctors,
  getDoctorById,
  getMyDoctorProfile,
  addSlot,
  deleteSlot,
  getDoctorSlots
} from '../controllers/doctorController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { requireVerifiedDoctor } from '../middleware/verifiedDoctorMiddleware.js';

const router = express.Router();

// Public / Authenticated doctor browse
router.get('/', getVerifiedDoctors);
router.get('/me/profile', verifyToken, requireRole('doctor'), getMyDoctorProfile);
router.get('/:id/slots', getDoctorSlots);
router.get('/:id', getDoctorById);

// Verified Doctor slot management
router.post('/slots', verifyToken, requireVerifiedDoctor, addSlot);
router.delete('/slots/:slotId', verifyToken, requireVerifiedDoctor, deleteSlot);

export default router;
