import request from 'supertest';
import app from '../server.js';
import { setupTestDB } from './setup.js';
import { generateToken } from '../utils/token.js';
import User from '../models/User.js';

describe('Role Guards & Route Protection Tests', () => {
  setupTestDB();

  let patientUser, doctorUser, adminUser, labUser;
  let patientToken, doctorToken, adminToken, labToken;

  beforeEach(async () => {
    patientUser = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      phone: '1111111111',
      passwordHash: 'hashed1',
      role: 'patient'
    });
    patientToken = generateToken(patientUser._id, 'patient');

    doctorUser = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test.com',
      phone: '2222222222',
      passwordHash: 'hashed2',
      role: 'doctor'
    });
    doctorToken = generateToken(doctorUser._id, 'doctor');

    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      phone: '3333333333',
      passwordHash: 'hashed3',
      role: 'admin'
    });
    adminToken = generateToken(adminUser._id, 'admin');

    labUser = await User.create({
      name: 'Test Lab Tech',
      email: 'lab@test.com',
      phone: '4444444444',
      passwordHash: 'hashed4',
      role: 'lab'
    });
    labToken = generateToken(labUser._id, 'lab');
  });

  it('allows authenticated users to query their own /api/auth/me profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('patient');
    expect(res.body.user.email).toBe('patient@test.com');
  });

  it('rejects access to protected routes when authorization header is missing or malformed', async () => {
    const res1 = await request(app).get('/api/auth/me');
    expect(res1.status).toBe(401);
    expect(res1.body.message).toMatch(/no token provided/i);

    const res2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'InvalidFormatString');
    expect(res2.status).toBe(401);
  });

  it('rejects tampered or forged JWT tokens', async () => {
    const forgedToken = patientToken.slice(0, -6) + 'abcdef';
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });
});
