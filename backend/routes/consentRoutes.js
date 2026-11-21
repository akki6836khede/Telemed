import express from 'express';
import {
  requestOTP,
  verifyOTP,
  getPendingConsentRequests,
  approveOnline,
  denyOnline,
  getConsentedPatientHistory,
  getConsentedPatientReports,
  getPatientAccessLogs
} from '../controllers/consentController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

// Doctor actions
router.post('/request-otp', requireRole('doctor'), requestOTP);
router.post('/verify-otp', requireRole('doctor'), verifyOTP);
router.get('/patient/:patientId/history', requireRole('doctor'), getConsentedPatientHistory);
router.get('/patient/:patientId/reports', requireRole('doctor'), getConsentedPatientReports);

// Patient actions
router.get('/pending', requireRole('patient'), getPendingConsentRequests);
router.post('/approve-online', requireRole('patient'), approveOnline);
router.post('/deny-online', requireRole('patient'), denyOnline);
router.get('/access-logs', requireRole('patient'), getPatientAccessLogs);

export default router;
