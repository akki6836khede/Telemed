import express from 'express';
import {
  uploadReport,
  getReportsByPatient,
  getSignedDownloadUrl,
  streamReportFile
} from '../controllers/reportController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { uploadReportMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Publicly stream file IF valid time-limited signed token is present in URL
router.get('/download/:token', streamReportFile);

// Protected routes
router.use(verifyToken);

// Lab Tech uploads report
router.post(
  '/upload',
  requireRole('lab'),
  uploadReportMiddleware.single('file'),
  uploadReport
);

// View patient reports metadata (patient themselves, or doctor/admin)
router.get(
  '/patient/:patientId',
  requireRole('patient', 'doctor', 'admin'),
  getReportsByPatient
);

// Generate 5-min signed view URL
router.get(
  '/:id/signed-url',
  requireRole('patient', 'doctor', 'admin'),
  getSignedDownloadUrl
);

export default router;
