import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { generateToken } from '../utils/token.js';

describe('Phase 4: Visits, Prescriptions, Allergy Warnings & Timeline Tests', () => {
  setupTestDB();

  let doctorToken, patientToken, appointmentId;

  beforeEach(async () => {
    // 1. Create Verified Doctor
    const docUser = await User.create({
      name: 'Dr. Vivek Murthy',
      email: 'dr.vivek@telemed.local',
      phone: '9988776655',
      passwordHash: 'dummy',
      role: 'doctor'
    });
    const doctor = await Doctor.create({
      userId: docUser._id,
      specialization: 'Internal Medicine',
      hospital: 'Metro General Hospital',
      verified: true
    });
    doctorToken = generateToken(docUser._id, 'doctor');

    // 2. Create Patient with Penicillin Allergy
    const patientUser = await User.create({
      name: 'Neha Kapoor',
      email: 'neha.kapoor@telemed.local',
      phone: '9988771122',
      passwordHash: 'dummy',
      role: 'patient'
    });
    const patient = await Patient.create({
      userId: patientUser._id,
      patientId: 'PT-000045',
      dob: new Date('1993-08-14'),
      gender: 'Female',
      bloodGroup: 'A+',
      allergies: ['Penicillin', 'Sulfa drugs']
    });
    patientToken = generateToken(patientUser._id, 'patient');

    // 3. Create Confirmed Appointment
    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      dateTime: new Date('2026-11-28T10:00:00Z'),
      status: 'Confirmed'
    });
    appointmentId = appointment._id;
  });

  describe('Allergy Warning Detection', () => {
    it('detects cross-reactive allergy (Amoxicillin for Penicillin allergy) and blocks save without override', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: 'Acute bacterial sinus infection',
          notes: 'Patient reports nasal congestion and facial pain',
          medicines: [
            { name: 'Amoxicillin 500mg', dosage: '1 tablet TID', duration: '7 days' },
            { name: 'Paracetamol 650mg', dosage: '1 tablet SOS', duration: '3 days' }
          ]
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.isAllergyConflict).toBe(true);
      expect(res.body.warnings.length).toBeGreaterThan(0);
      expect(res.body.warnings[0].allergy).toBe('penicillin');
    });

    it('allows doctor to proceed when explicitly overriding allergy warning', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: 'Acute bacterial sinus infection',
          notes: 'Patient sensitized; desensitization protocol active.',
          medicines: [
            { name: 'Amoxicillin 500mg', dosage: '1 tablet TID', duration: '7 days' }
          ],
          overrideAllergyWarning: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.visit.diagnosis).toBe('Acute bacterial sinus infection');
      expect(res.body.prescription.medicines.length).toBe(1);

      // Verify appointment transitioned to Completed
      const apptCheck = await Appointment.findById(appointmentId);
      expect(apptCheck.status).toBe('Completed');
    });
  });

  describe('Medical History Timeline', () => {
    beforeEach(async () => {
      // Save completed visit with safe non-allergic medicines
      await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: 'Seasonal Allergic Rhinitis',
          notes: 'Standard antihistamine therapy recommended',
          medicines: [
            { name: 'Cetirizine 10mg', dosage: '1 tablet at bedtime', duration: '5 days' }
          ]
        });
    });

    it('patient can fetch their comprehensive chronological timeline', async () => {
      const res = await request(app)
        .get('/api/patients/me/timeline')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.timeline.length).toBe(1);
      expect(res.body.timeline[0].diagnosis).toBe('Seasonal Allergic Rhinitis');
      expect(res.body.timeline[0].doctorName).toBe('Dr. Vivek Murthy');
      expect(res.body.timeline[0].prescription[0].name).toBe('Cetirizine 10mg');
    });
  });
});
