import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { generateToken } from '../utils/token.js';

describe('Phase 3: Slot Management & Double-Booking Prevention Tests', () => {
  setupTestDB();

  let verifiedDoctorToken, unverifiedDoctorToken, patient1Token, patient2Token;
  let verifiedDoctorId, unverifiedDoctorId;

  beforeEach(async () => {
    // 1. Create Verified Doctor
    const docUser1 = await User.create({
      name: 'Dr. Anita Roy',
      email: 'anita.roy@telemed.local',
      phone: '9888877771',
      passwordHash: 'dummy',
      role: 'doctor'
    });
    const doc1 = await Doctor.create({
      userId: docUser1._id,
      specialization: 'Cardiology',
      hospital: 'Apex Heart Institute',
      verified: true
    });
    verifiedDoctorId = doc1._id;
    verifiedDoctorToken = generateToken(docUser1._id, 'doctor');

    // 2. Create Unverified Doctor
    const docUser2 = await User.create({
      name: 'Dr. Unverified Doe',
      email: 'unverified@telemed.local',
      phone: '9888877772',
      passwordHash: 'dummy',
      role: 'doctor'
    });
    const doc2 = await Doctor.create({
      userId: docUser2._id,
      specialization: 'General',
      hospital: 'Clinic X',
      verified: false
    });
    unverifiedDoctorId = doc2._id;
    unverifiedDoctorToken = generateToken(docUser2._id, 'doctor');

    // 3. Create Patient 1
    const pUser1 = await User.create({
      name: 'Rohan Mehra',
      email: 'rohan@telemed.local',
      phone: '9111122221',
      passwordHash: 'dummy',
      role: 'patient'
    });
    await Patient.create({
      userId: pUser1._id,
      patientId: 'PT-000010',
      dob: new Date('1990-01-01'),
      gender: 'Male',
      bloodGroup: 'A+'
    });
    patient1Token = generateToken(pUser1._id, 'patient');

    // 4. Create Patient 2
    const pUser2 = await User.create({
      name: 'Kavita Sen',
      email: 'kavita@telemed.local',
      phone: '9111122222',
      passwordHash: 'dummy',
      role: 'patient'
    });
    await Patient.create({
      userId: pUser2._id,
      patientId: 'PT-000011',
      dob: new Date('1994-06-20'),
      gender: 'Female',
      bloodGroup: 'B+'
    });
    patient2Token = generateToken(pUser2._id, 'patient');
  });

  describe('Slot Creation', () => {
    it('verified doctor can add availability slot', async () => {
      const res = await request(app)
        .post('/api/doctors/slots')
        .set('Authorization', `Bearer ${verifiedDoctorToken}`)
        .send({
          date: '2026-11-20',
          startTime: '10:00',
          endTime: '10:30'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.slots.length).toBe(1);
      expect(res.body.slots[0].startTime).toBe('10:00');
    });

    it('unverified doctor is blocked from creating slots', async () => {
      const res = await request(app)
        .post('/api/doctors/slots')
        .set('Authorization', `Bearer ${unverifiedDoctorToken}`)
        .send({
          date: '2026-11-20',
          startTime: '10:00',
          endTime: '10:30'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/pending administrator verification/i);
    });
  });

  describe('Concurrency & Double Booking Prevention', () => {
    const bookingSlotTime = '2026-11-25T11:00:00.000Z';

    it('prevents sequential double booking for the same slot', async () => {
      // First booking succeeds
      const res1 = await request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          doctorId: verifiedDoctorId,
          dateTime: bookingSlotTime,
          notes: 'First checkup'
        });

      expect(res1.status).toBe(201);
      expect(res1.body.appointment.status).toBe('Pending');

      // Second booking for same doctor & time must fail with 409 Conflict
      const res2 = await request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          doctorId: verifiedDoctorId,
          dateTime: bookingSlotTime,
          notes: 'Second checkup attempt'
        });

      expect(res2.status).toBe(409);
      expect(res2.body.message).toMatch(/conflict/i);
    });

    it('prevents simultaneous concurrent double bookings', async () => {
      const concurrentSlotTime = '2026-11-26T14:30:00.000Z';

      // Fire two simultaneous requests
      const [attempt1, attempt2] = await Promise.all([
        request(app)
          .post('/api/appointments/book')
          .set('Authorization', `Bearer ${patient1Token}`)
          .send({ doctorId: verifiedDoctorId, dateTime: concurrentSlotTime }),
        request(app)
          .post('/api/appointments/book')
          .set('Authorization', `Bearer ${patient2Token}`)
          .send({ doctorId: verifiedDoctorId, dateTime: concurrentSlotTime })
      ]);

      const statuses = [attempt1.status, attempt2.status].sort();
      // Exactly one must be 201 Created and the other must be 409 Conflict
      expect(statuses).toEqual([201, 409]);
    });
  });

  describe('Appointment Status Flow & Video Room', () => {
    it('doctor confirms appointment, enabling the Jitsi meeting link', async () => {
      const bookRes = await request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          doctorId: verifiedDoctorId,
          dateTime: '2026-11-27T16:00:00.000Z'
        });

      const apptId = bookRes.body.appointment._id;

      // Doctor confirms
      const confirmRes = await request(app)
        .patch(`/api/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${verifiedDoctorToken}`)
        .send({ status: 'Confirmed' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.appointment.status).toBe('Confirmed');

      // Patient retrieves meeting link
      const meetingRes = await request(app)
        .get(`/api/appointments/${apptId}/meeting`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(meetingRes.status).toBe(200);
      expect(meetingRes.body.meetingRoom).toMatch(/^telehealth-/);
      expect(meetingRes.body.meetingLink).toContain('meet.jit.si');
    });
  });
});
