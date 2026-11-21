import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { generateToken } from '../utils/token.js';

describe('Phase 2: Profiles, Admin Doctor Verification & Lookups', () => {
  setupTestDB();

  let adminToken, patientToken, doctorToken, doctorId, patientIdStr;

  beforeEach(async () => {
    // 1. Create Admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@telemed.local',
      phone: '9990001111',
      passwordHash: 'dummyhash',
      role: 'admin'
    });
    adminToken = generateToken(admin._id, 'admin');

    // 2. Create Unverified Doctor
    const doctorUser = await User.create({
      name: 'Dr. Rahul Verma',
      email: 'rahul.verma@telemed.local',
      phone: '9990002222',
      passwordHash: 'dummyhash',
      role: 'doctor'
    });
    const doctor = await Doctor.create({
      userId: doctorUser._id,
      specialization: 'Neurology',
      hospital: 'Metro Health Hospital',
      verified: false
    });
    doctorId = doctor._id;
    doctorToken = generateToken(doctorUser._id, 'doctor');

    // 3. Create Patient
    const patientUser = await User.create({
      name: 'Sonia Patel',
      email: 'sonia.patel@telemed.local',
      phone: '9990003333',
      passwordHash: 'dummyhash',
      role: 'patient'
    });
    const patient = await Patient.create({
      userId: patientUser._id,
      patientId: 'PT-000001',
      dob: new Date('1992-04-12'),
      gender: 'Female',
      bloodGroup: 'O-',
      allergies: ['Sulfa drugs', 'Latex'],
      abhaId: 'ABHA-9988-1122'
    });
    patientIdStr = patient.patientId;
    patientToken = generateToken(patientUser._id, 'patient');
  });

  describe('Doctor Verification by Admin', () => {
    it('admin can list all doctors and filter by unverified', async () => {
      const res = await request(app)
        .get('/api/admin/doctors?verified=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.doctors.length).toBe(1);
      expect(res.body.doctors[0].specialization).toBe('Neurology');
    });

    it('non-admin is rejected when attempting doctor verification', async () => {
      const res = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ verified: true });

      expect(res.status).toBe(403);
    });

    it('admin can verify a doctor successfully', async () => {
      const res = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verified: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.doctor.verified).toBe(true);

      // Verify in public doctor listing
      const verifiedList = await request(app).get('/api/doctors');
      expect(verifiedList.status).toBe(200);
      expect(verifiedList.body.doctors.some((d) => d._id === String(doctorId))).toBe(true);
    });
  });

  describe('Patient Profile Management', () => {
    it('patient can fetch their full profile with allergies & emergency token', async () => {
      const res = await request(app)
        .get('/api/patients/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient.patientId).toBe('PT-000001');
      expect(res.body.patient.bloodGroup).toBe('O-');
      expect(res.body.patient.allergies).toContain('Sulfa drugs');
      expect(res.body.patient.emergencyToken).toBeDefined();
    });

    it('patient can update their clinical details', async () => {
      const res = await request(app)
        .put('/api/patients/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          bloodGroup: 'O+',
          allergies: ['Sulfa drugs', 'Latex', 'Aspirin']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient.bloodGroup).toBe('O+');
      expect(res.body.patient.allergies).toContain('Aspirin');
    });
  });

  describe('Patient Lookup by PT-XXXXXX', () => {
    it('authorized role (doctor/admin/lab) can lookup patient by PT-000001', async () => {
      const res = await request(app)
        .get(`/api/patients/lookup/${patientIdStr}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient.name).toBe('Sonia Patel');
      expect(res.body.patient.patientId).toBe('PT-000001');
    });

    it('returns 404 for non-existent patient ID', async () => {
      const res = await request(app)
        .get('/api/patients/lookup/PT-999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Admin Platform Statistics', () => {
    it('returns accurate platform counts', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalUsers).toBe(3);
      expect(res.body.stats.totalPatients).toBe(1);
      expect(res.body.stats.totalDoctors).toBe(1);
      expect(res.body.stats.pendingDoctors).toBe(1);
    });
  });
});
