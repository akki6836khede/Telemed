import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { generateToken } from '../utils/token.js';

describe('Phase 7: Emergency QR Card & Public Triage Summary Tests', () => {
  setupTestDB();

  let patientToken, patientIdStr, emergencyToken;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Sunil Gavaskar',
      email: 'sunil@telemed.local',
      phone: '+91 9888223344',
      passwordHash: 'dummy',
      role: 'patient'
    });
    const patient = await Patient.create({
      userId: user._id,
      patientId: 'PT-000200',
      dob: new Date('1975-07-10'),
      gender: 'Male',
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Aspirin'],
      emergencyCardEnabled: true
    });
    patientIdStr = patient.patientId;
    emergencyToken = patient.emergencyToken;
    patientToken = generateToken(user._id, 'patient');
  });

  describe('Emergency QR Metadata', () => {
    it('patient can fetch their active emergency card and token', async () => {
      const res = await request(app)
        .get('/api/emergency/card')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.card.emergencyToken).toBe(emergencyToken);
      expect(res.body.card.publicUrl).toContain(`/emergency/${emergencyToken}`);
      expect(res.body.card.bloodGroup).toBe('O+');
      expect(res.body.card.allergies).toContain('Penicillin');
    });
  });

  describe('Public Emergency Triage Access', () => {
    it('first responder can access minimal emergency summary with valid token without login', async () => {
      const res = await request(app).get(`/api/emergency/public/${emergencyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.emergencySummary.patientName).toBe('Sunil Gavaskar');
      expect(res.body.emergencySummary.bloodGroup).toBe('O+');
      expect(res.body.emergencySummary.allergies).toContain('Aspirin');
      expect(res.body.emergencySummary.emergencyContactPhone).toBe('+91 9888223344');
    });

    it('rejects public access when patient toggles emergency card OFF', async () => {
      // 1. Patient disables emergency card
      const toggleRes = await request(app)
        .patch('/api/emergency/toggle')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ enabled: false });

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.isEnabled).toBe(false);

      // 2. Public access is now blocked
      const publicRes = await request(app).get(`/api/emergency/public/${emergencyToken}`);
      expect(publicRes.status).toBe(403);
      expect(publicRes.body.message).toMatch(/disabled by the patient/i);
    });

    it('invalidates old token when patient regenerates emergency card token', async () => {
      // 1. Patient regenerates token
      const regenRes = await request(app)
        .post('/api/emergency/regenerate')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(regenRes.status).toBe(200);
      const newToken = regenRes.body.emergencyToken;
      expect(newToken).not.toBe(emergencyToken);

      // 2. Old token must now fail with 404
      const oldTokenRes = await request(app).get(`/api/emergency/public/${emergencyToken}`);
      expect(oldTokenRes.status).toBe(404);

      // 3. New token succeeds
      const newTokenRes = await request(app).get(`/api/emergency/public/${newToken}`);
      expect(newTokenRes.status).toBe(200);
      expect(newTokenRes.body.emergencySummary.patientName).toBe('Sunil Gavaskar');
    });
  });
});
