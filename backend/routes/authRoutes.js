import express from 'express';
import {
  registerPatient,
  registerDoctor,
  login,
  getMe
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/register-patient', authLimiter, registerPatient);
router.post('/register-doctor', authLimiter, registerDoctor);
router.post('/login', authLimiter, login);
router.get('/me', verifyToken, getMe);

export default router;
