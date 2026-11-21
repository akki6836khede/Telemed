import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getUploadDestination } from '../utils/storageService.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDestination());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueKey = `${uuidv4()}${ext}`;
    cb(null, uniqueKey);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only PDF, PNG, and JPEG formats are permitted for medical reports.'),
      false
    );
  }
};

export const uploadReportMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max limit
  }
});
