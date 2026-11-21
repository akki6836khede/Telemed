import express from 'express';
import {
  getAllDoctors,
  verifyDoctor,
  getAllUsers,
  getStats
} from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, requireRole('admin'));

router.get('/doctors', getAllDoctors);
router.patch('/doctors/:id/verify', verifyDoctor);
router.get('/users', getAllUsers);
router.get('/stats', getStats);

export default router;
