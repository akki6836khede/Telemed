import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { generateToken } from '../utils/token.js';

describe('Phase 5: Lab Reports & Secure Signed URLs Tests', () => {
  setupTestDB();

  let labToken, patientToken, otherPatientToken, patientIdStr;

  beforeEach(async () => {
    // 1. Create Lab Technician
    const labUser = await User.create({
      name: 'Pathology Lab Tech',
      email: 'lab.tech@telemed.local',
      phone: '9888111222',
      passwordHash: 'dummy',
      role: 'lab'
    });
    labToken = generateToken(labUser._id, 'lab');

    // 2. Create Patient 1
    const pUser1 = await User.create({
      name: 'Aditya Gupta',
      email: 'aditya@telemed.local',
      phone: '9888111333',
      passwordHash: 'dummy',
      role: 'patient'
    });
    const p1 = await Patient.create({
      userId: pUser1._id,
      patientId: 'PT-000088',
      dob: new Date('1985-07-21'),
      gender: 'Male',
      bloodGroup: 'O+'
    });
    patientIdStr = p1.patientId;
    patientToken = generateToken(pUser1._id, 'patient');

    // 3. Create Patient 2 (Unauthorized to see Patient 1 reports)
    const pUser2 = await User.create({
      name: 'Ritu Sen',
      email: 'ritu@telemed.local',
      phone: '9888111444',
      passwordHash: 'dummy',
      role: 'patient'
    });
    await Patient.create({
      userId: pUser2._id,
      patientId: 'PT-000089',
      dob: new Date('1990-11-12'),
      gender: 'Female',
      bloodGroup: 'AB-'
    });
    otherPatientToken = generateToken(pUser2._id, 'patient');
  });

  describe('Report Upload by Lab Tech', () => {
    it('lab tech uploads valid PDF report successfully', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${labToken}`)
        .field('patientId', patientIdStr)
        .field('title', 'Complete Blood Count (CBC)')
        .field('type', 'Blood Test')
        .attach('file', Buffer.from('%PDF-1.4 test file mock content'), {
          filename: 'cbc_report.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.report.title).toBe('Complete Blood Count (CBC)');
      expect(res.body.report.fileKey).toMatch(/\.pdf$/);
    });

    it('rejects report upload by patient (only Lab Tech authorized)', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('patientId', patientIdStr)
        .field('title', 'Self upload')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(403);
    });

    it('rejects report upload if patient ID does not exist', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${labToken}`)
        .field('patientId', 'PT-999999')
        .field('title', 'CBC')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/no patient found/i);
    });
  });

  describe('Report Retrieval & Signed URLs', () => {
    let reportId;

    beforeEach(async () => {
      const uploadRes = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${labToken}`)
        .field('patientId', patientIdStr)
        .field('title', 'Lipid Panel Report')
        .field('type', 'Blood Test')
        .attach('file', Buffer.from('%PDF-1.4 mock lipid test report'), {
          filename: 'lipid.pdf',
          contentType: 'application/pdf'
        });
      reportId = uploadRes.body.report._id;
    });

    it('patient can view their own reports list', async () => {
      const res = await request(app)
        .get(`/api/reports/patient/${patientIdStr}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reports.length).toBe(1);
      expect(res.body.reports[0].title).toBe('Lipid Panel Report');
    });

    it('prevents another patient from viewing reports of Patient 1', async () => {
      const res = await request(app)
        .get(`/api/reports/patient/${patientIdStr}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(res.status).toBe(403);
    });

    it('generates a 5-minute time-limited signed URL and streams file', async () => {
      // 1. Request signed URL
      const urlRes = await request(app)
        .get(`/api/reports/${reportId}/signed-url`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(urlRes.status).toBe(200);
      expect(urlRes.body.signedUrl).toContain('/api/reports/download/');

      const downloadToken = urlRes.body.signedUrl.split('/download/')[1];

      // 2. Stream using valid token
      const streamRes = await request(app).get(`/api/reports/download/${downloadToken}`);
      expect(streamRes.status).toBe(200);
      expect(streamRes.headers['content-type']).toBe('application/pdf');

      // 3. Reject tampered token
      const badStreamRes = await request(app).get(`/api/reports/download/${downloadToken}tampered`);
      expect(badStreamRes.status).toBe(401);
    });
  });
});
