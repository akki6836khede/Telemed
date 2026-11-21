import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const getUploadDestination = () => UPLOAD_DIR;

// Generate a time-limited signed URL for viewing/downloading the report
export const generateSignedReportUrl = (reportId, fileKey, originalName) => {
  const isLocalStorage = process.env.USE_LOCAL_STORAGE !== 'false';

  if (isLocalStorage) {
    const secret = process.env.JWT_SECRET || 'dev_telehealth_secret_key_change_in_prod';
    // 5-minute time-limited signed token
    const token = jwt.sign(
      {
        reportId,
        fileKey,
        originalName,
        purpose: 'REPORT_DOWNLOAD'
      },
      secret,
      { expiresIn: '5m' }
    );

    const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
    return `${baseUrl}/api/reports/download/${token}`;
  }

  // S3 Fallback placeholder (when S3 configured):
  // const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: fileKey });
  // return await getSignedUrl(s3Client, command, { expiresIn: 300 });
  return `https://s3.amazonaws.com/${process.env.S3_BUCKET_NAME}/${fileKey}?mock-presigned=true`;
};

// Validate a signed report download token
export const verifySignedReportToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'dev_telehealth_secret_key_change_in_prod';
    const decoded = jwt.verify(token, secret);
    if (decoded.purpose !== 'REPORT_DOWNLOAD') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};
