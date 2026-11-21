import fs from 'fs';
import path from 'path';
import Report from '../models/Report.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import AccessLog from '../models/AccessLog.js';
import {
  generateSignedReportUrl,
  verifySignedReportToken,
  getUploadDestination
} from '../utils/storageService.js';

// @desc    Upload medical test report
// @route   POST /api/reports/upload
// @access  Private (Lab Technician)
export const uploadReport = async (req, res, next) => {
  try {
    const { patientId, title, type } = req.body;

    if (!patientId || !title) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Patient ID and report title are required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF or image report.'
      });
    }

    const patient = await Patient.findOne({
      patientId: patientId.toUpperCase().trim()
    });

    if (!patient) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: `No patient found with ID: ${patientId}`
      });
    }

    const report = await Report.create({
      patientId: patient._id,
      uploadedBy: req.user._id,
      title,
      type: type || 'Blood Test',
      fileKey: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    return res.status(201).json({
      success: true,
      message: 'Medical report uploaded successfully to patient record.',
      report
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get reports for a patient
// @route   GET /api/reports/patient/:patientId
// @access  Private (Patient / Consented Doctor / Admin)
export const getReportsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({
      patientId: patientId.toUpperCase().trim()
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    // Role check: If patient, must be own record
    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ userId: req.user._id });
      if (!selfPatient || selfPatient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot view other patients\' reports.'
        });
      }
    }

    const reports = await Report.find({ patientId: patient._id })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get secure time-limited signed URL for a report
// @route   GET /api/reports/:id/signed-url
// @access  Private (Patient / Consented Doctor / Admin)
export const getSignedDownloadUrl = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id).populate('patientId');
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    // Verify requester ownership if patient
    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ userId: req.user._id });
      if (!selfPatient || selfPatient._id.toString() !== report.patientId._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied.'
        });
      }
    }

    // If requester is a doctor, log access under DPDP Act requirements
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
        await AccessLog.create({
          doctorId: doctor._id,
          patientId: report.patientId._id,
          action: 'VIEW_LAB_REPORTS'
        });
      }
    }

    const signedUrl = generateSignedReportUrl(
      report._id,
      report.fileKey,
      report.originalName
    );

    return res.json({
      success: true,
      signedUrl,
      expiresIn: '5 minutes'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream file via time-limited signed token
// @route   GET /api/reports/download/:token
// @access  Public via Signed Token
export const streamReportFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const decoded = verifySignedReportToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired report access token. Please request a new signed link.'
      });
    }

    const filePath = path.join(getUploadDestination(), decoded.fileKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'The requested file was not found on the storage server.'
      });
    }

    const ext = path.extname(decoded.fileKey).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.png'
        ? 'image/png'
        : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${decoded.originalName || 'report' + ext}"`
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};
