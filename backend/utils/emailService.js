import nodemailer from 'nodemailer';

/**
 * Creates and returns a Nodemailer transporter based on environment variables.
 * Returns null if SMTP credentials are not configured or when running tests.
 */
const getTransporter = () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
};

/**
 * Sends DPDP Consent Verification OTP to the patient's registered email address.
 *
 * @param {Object} options
 * @param {string} options.toEmail - Patient's email
 * @param {string} options.patientName - Patient's full name
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} options.doctorName - Doctor requesting access
 * @param {string} options.doctorSpecialization - Doctor's specialization
 * @param {string} options.hospital - Doctor's hospital/clinic
 * @param {number} [options.expiresInMinutes=5] - Validity in minutes
 * @returns {Promise<{success: boolean, sent: boolean, messageId?: string, error?: string}>}
 */
export const sendConsentOTPEmail = async ({
  toEmail,
  patientName = 'Patient',
  otp,
  doctorName = 'Consulting Physician',
  doctorSpecialization = 'General Medicine',
  hospital = 'TeleMed Partner Clinic',
  expiresInMinutes = 5
}) => {
  const transporter = getTransporter();

  const formattedDocName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

  // Always log to console for development visibility and debugging
  console.log('\n====================================================');
  console.log(`[DPDP CONSENT OTP DISPATCH]`);
  console.log(`To: ${patientName} <${toEmail || 'No email specified'}>`);
  console.log(`Requested by: ${formattedDocName} (${doctorSpecialization}, ${hospital})`);
  console.log(`OTP Code: >>> ${otp} <<< (Valid for ${expiresInMinutes} mins)`);
  console.log(`Purpose: Explicit consent to grant temporary record access to consulting doctor.`);
  console.log('====================================================\n');

  if (!transporter) {
    console.log('[EmailService] SMTP_USER or SMTP_PASS not set in .env. Email simulated in console.');
    return {
      success: true,
      sent: false,
      simulated: true,
      message: 'SMTP credentials not configured. OTP logged to console.'
    };
  }

  const fromAddress = process.env.EMAIL_FROM || `"TeleMed Healthcare" <${process.env.SMTP_USER}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TeleMed DPDP Consent Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .doctor-card { background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .doctor-card p { margin: 4px 0; font-size: 13px; color: #115e59; }
        .doctor-name { font-weight: 700; font-size: 15px; color: #0f766e; }
        .otp-container { text-align: center; margin: 28px 0; }
        .otp-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
        .otp-box { display: inline-block; background-color: #f8fafc; border: 2px dashed #0d9488; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', monospace; }
        .expiry-notice { font-size: 12px; color: #e11d48; font-weight: 600; margin-top: 8px; }
        .dpdp-box { background-color: #f1f5f9; border-left: 4px solid #64748b; padding: 12px 16px; margin-top: 24px; border-radius: 0 6px 6px 0; }
        .dpdp-box p { margin: 0; font-size: 12px; color: #475569; line-height: 1.5; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TeleMed Portal</h1>
          <p>Secure Telehealth & Digital Consent Verification</p>
        </div>
        <div class="body">
          <div class="greeting">Hello, ${patientName}</div>
          <p class="message">
            A verified doctor has requested temporary, time-limited access to view your medical records, prescriptions, and lab reports on the TeleMed Portal.
          </p>

          <div class="doctor-card">
            <p class="doctor-name">${formattedDocName}</p>
            <p><strong>Specialization:</strong> ${doctorSpecialization}</p>
            <p><strong>Hospital / Clinic:</strong> ${hospital}</p>
          </div>

          <div class="otp-container">
            <div class="otp-label">Your DPDP Consent Verification Code</div>
            <div class="otp-box">${otp}</div>
            <div class="expiry-notice">This code will expire in ${expiresInMinutes} minutes.</div>
          </div>

          <p class="message" style="font-size: 13px;">
            Share this 6-digit code with your doctor only if you consent to them accessing your clinical timeline. You may also approve or deny this request directly from your <strong>Patient Dashboard</strong> under "Pending Consent Requests".
          </p>

          <div class="dpdp-box">
            <p><strong>Digital Personal Data Protection (DPDP) Act 2023:</strong></p>
            <p>Access is strictly time-limited to 30 minutes following your authorization, and every access is recorded in your personal access log ("Who viewed my records").</p>
          </div>
        </div>
        <div class="footer">
          <p>If you did not request or expect this verification code, please ignore this email or deny the request in your portal dashboard.</p>
          <p>&copy; ${new Date().getFullYear()} TeleMed Portal. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
TeleMed Portal - DPDP Consent Verification Code
------------------------------------------------

Hello ${patientName},

${formattedDocName} (${doctorSpecialization}, ${hospital}) has requested temporary access to view your medical records and lab reports on the TeleMed Portal.

YOUR VERIFICATION CODE: ${otp}
(Valid for ${expiresInMinutes} minutes)

Under the DPDP Act 2023, access is time-limited to 30 minutes upon your authorization.
If you did not initiate this request, you can safely disregard this email or decline it from your patient dashboard.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[TeleMed] Your DPDP Consent Verification Code: ${otp}`,
      text: textContent,
      html: htmlContent
    });

    console.log(`[EmailService] Consent OTP email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return {
      success: true,
      sent: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[EmailService Error] Failed to send email to ${toEmail}:`, err.message);
    return {
      success: false,
      sent: false,
      simulated: false,
      error: err.message
    };
  }
};
