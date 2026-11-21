import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { generateToken } from '../utils/token.js';

describe('Phase 6: DPDP OTP Consent Flow & Access Log Audit Tests', () => {
  setupTestDB();

  let doctorToken, patientToken, doctorId, patientIdStr, patientObjId;

  beforeEach(async () => {
    // 1. Create Verified Doctor
    const docUser = await User.create({
      name: 'Dr. Suresh Joshi',
      email: 'dr.suresh@telemed.local',
      phone: '9777111222',
      passwordHash: 'dummy',
      role: 'doctor'
    });
    const doctor = await Doctor.create({
      userId: docUser._id,
      specialization: 'Pulmonology',
      hospital: 'Apex Medical Center',
      verified: true
    });
    doctorId = doctor._id;
    doctorToken = generateToken(docUser._id, 'doctor');

    // 2. Create Patient
    const patientUser = await User.create({
      name: 'Vikram Seth',
      email: 'vikram.seth@telemed.local',
      phone: '9777111333',
      passwordHash: 'dummy',
      role: 'patient'
    });
    const patient = await Patient.create({
      userId: patientUser._id,
      patientId: 'PT-000100',
      dob: new Date('1982-03-10'),
      gender: 'Male',
      bloodGroup: 'B-'
    });
    patientIdStr = patient.patientId;
    patientObjId = patient._id;
    patientToken = generateToken(patientUser._id, 'patient');
  });

  describe('Strict Record Lockout Without Consent', () => {
    it('blocks doctor from viewing patient history without explicit active consent', async () => {
      const res = await request(app)
        .get(`/api/consent/patient/${patientIdStr}/history`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/consent required/i);
    });

    it('blocks doctor from viewing patient reports without explicit active consent', async () => {
      const res = await request(app)
        .get(`/api/consent/patient/${patientIdStr}/reports`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/consent required/i);
    });
  });

  describe('OTP Generation, Hashing & Verification', () => {
    let capturedOtp;

    it('doctor requests OTP consent -> generates 6-digit OTP and logs pending request', async () => {
      const res = await request(app)
        .post('/api/consent/request-otp')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patientId: patientIdStr });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.simulatedOTP).toBeDefined();
      expect(res.body.simulatedOTP).toMatch(/^\d{6}$/);

      capturedOtp = res.body.simulatedOTP;

      // Patient checks pending requests
      const pendingRes = await request(app)
        .get('/api/consent/pending')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.count).toBe(1);
      expect(pendingRes.body.pending[0].doctorId.specialization).toBe('Pulmonology');
    });

    it('fails verification with incorrect OTP and tracks remaining attempts', async () => {
      // 1. Generate OTP
      await request(app)
        .post('/api/consent/request-otp')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patientId: patientIdStr });

      // 2. Submit wrong OTP
      const res = await request(app)
        .post('/api/consent/verify-otp')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patientId: patientIdStr, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/incorrect otp/i);
    });

    it('successful OTP verification unlocks clinical records and writes DPDP access log', async () => {
      // 1. Generate OTP
      const reqRes = await request(app)
        .post('/api/consent/request-otp')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patientId: patientIdStr });

      const otp = reqRes.body.simulatedOTP;

      // 2. Verify OTP
      const verifyRes = await request(app)
        .post('/api/consent/verify-otp')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patientId: patientIdStr, otp });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.approvedUntil).toBeDefined();

      // 3. Now doctor queries medical history -> succeeds!
      const historyRes = await request(app)
        .get(`/api/consent/patient/${patientIdStr}/history`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.success).toBe(true);

      // 4. Patient queries "Who viewed my records"
      const logRes = await request(app)
        .get('/api/consent/access-logs')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(logRes.status).toBe(200);
      expect(logRes.body.logs.length).toBeGreaterThan(0);
      expect(logRes.body.logs.some((l) => l.action === 'VIEW_MEDICAL_HISTORY')).toBe(true);
      expect(logRes.body.logs[0].doctorId.hospital).toBe('Apex Medical Center');
    });
  });

  describe('Direct Patient Online Approval Flow', () => {
    it('patient can approve consent directly from their dashboard without doctor typing OTP', async () => {
      // 1. Doctor requests OTP
      await request(app)
        .post('/api/consent/request-otp')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patientId: patientIdStr });

      // 2. Patient fetches pending request
      const pendingRes = await request(app)
        .get('/api/consent/pending')
        .set('Authorization', `Bearer ${patientToken}`);

      const consentId = pendingRes.body.pending[0]._id;

      // 3. Patient approves online
      const approveRes = await request(app)
        .post('/api/consent/approve-online')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ consentId });

      expect(approveRes.status).toBe(200);

      // 4. Doctor now has immediate clinical access
      const reportsRes = await request(app)
        .get(`/api/consent/patient/${patientIdStr}/reports`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(reportsRes.status).toBe(200);
      expect(reportsRes.body.success).toBe(true);
    });
  });
});
