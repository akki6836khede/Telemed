import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

describe('Auth & Role Protection API Tests', () => {
  setupTestDB();

  describe('POST /api/auth/register-patient', () => {
    it('should register a new patient with auto-incrementing PT-XXXXXX ID and hashed password', async () => {
      const res = await request(app)
        .post('/api/auth/register-patient')
        .send({
          name: 'Aarav Sharma',
          email: 'aarav@example.com',
          phone: '+91 9876543210',
          password: 'Password123!',
          dob: '1995-05-15',
          gender: 'Male',
          bloodGroup: 'B+',
          allergies: ['Penicillin', 'Peanuts'],
          abhaId: '12-3456-7890-1234'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user.patientProfile.patientId).toMatch(/^PT-\d{6}$/);
      expect(res.body.user.patientProfile.bloodGroup).toBe('B+');
      expect(res.body.user.patientProfile.allergies).toContain('Penicillin');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify password was securely hashed in database
      const dbUser = await User.findOne({ email: 'aarav@example.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).not.toBe('Password123!');
      expect(await dbUser.comparePassword('Password123!')).toBe(true);
    });

    it('should reject registration if email already exists', async () => {
      await request(app)
        .post('/api/auth/register-patient')
        .send({
          name: 'First User',
          email: 'duplicate@example.com',
          phone: '+91 9876543210',
          password: 'Password123!',
          dob: '1990-01-01',
          gender: 'Female',
          bloodGroup: 'O+'
        });

      const res = await request(app)
        .post('/api/auth/register-patient')
        .send({
          name: 'Second User',
          email: 'duplicate@example.com',
          phone: '+91 9876543211',
          password: 'Password123!',
          dob: '1992-02-02',
          gender: 'Male',
          bloodGroup: 'A+'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/register-doctor', () => {
    it('should register doctor with verified: false by default', async () => {
      const res = await request(app)
        .post('/api/auth/register-doctor')
        .send({
          name: 'Dr. Priya Desai',
          email: 'priya.desai@example.com',
          phone: '+91 9123456789',
          password: 'DoctorPass123!',
          specialization: 'Cardiology',
          hospital: 'Apollo City Hospital'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('doctor');
      expect(res.body.user.doctorProfile.verified).toBe(false);
      expect(res.body.user.doctorProfile.specialization).toBe('Cardiology');
    });
  });

  describe('POST /api/auth/login & GET /api/auth/me', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register-patient')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+91 9999988888',
          password: 'SecretPassword!',
          dob: '1988-10-10',
          gender: 'Male',
          bloodGroup: 'AB+'
        });
    });

    it('should login successfully with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'SecretPassword!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('John Doe');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should fail login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should access /api/auth/me when authenticated with Bearer token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'SecretPassword!'
        });

      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('john@example.com');
      expect(meRes.body.user.profile.bloodGroup).toBe('AB+');
    });

    it('should block /api/auth/me when no token is supplied', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
