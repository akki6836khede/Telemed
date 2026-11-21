import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Counter from '../models/Counter.js';
import Appointment from '../models/Appointment.js';
import Visit from '../models/Visit.js';
import Prescription from '../models/Prescription.js';
import Report from '../models/Report.js';
import AccessLog from '../models/AccessLog.js';
import { connectDB } from '../config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  console.log('[Seed] Clearing existing collections...');
  await User.deleteMany();
  await Patient.deleteMany();
  await Doctor.deleteMany();
  await Counter.deleteMany();
  await Appointment.deleteMany();
  await Visit.deleteMany();
  await Prescription.deleteMany();
  await Report.deleteMany();
  await AccessLog.deleteMany();

  console.log('[Seed] Initializing Patient ID sequence counter...');
  await Counter.create({ id: 'patientId', seq: 3 });

  // 1. Create 1 Administrator
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
  const admin = await User.create({
    name: 'Platform Administrator',
    email: 'admin@telemed.local',
    phone: '+91 9000000001',
    passwordHash: adminPasswordHash,
    role: 'admin'
  });
  console.log(`[Seed] Created Admin: ${admin.email}`);

  // 2. Create 2 Doctors (1 Verified, 1 Pending Review)
  const doctorPasswordHash = await bcrypt.hash('DoctorPass123!', 10);

  const doc1User = await User.create({
    name: 'Dr. Ramesh Sharma',
    email: 'dr.sharma@telemed.local',
    phone: '+91 9000000002',
    passwordHash: doctorPasswordHash,
    role: 'doctor'
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const doc1 = await Doctor.create({
    userId: doc1User._id,
    specialization: 'Cardiology',
    hospital: 'Apollo City Hospital',
    verified: true,
    slots: [
      { date: tomorrowStr, startTime: '10:00', endTime: '10:30', isBooked: true },
      { date: tomorrowStr, startTime: '11:00', endTime: '11:30', isBooked: false },
      { date: tomorrowStr, startTime: '14:00', endTime: '14:30', isBooked: false },
      { date: tomorrowStr, startTime: '15:00', endTime: '15:30', isBooked: false }
    ]
  });
  console.log(`[Seed] Created Verified Doctor: ${doc1User.email} (Cardiology, Apollo Hospital)`);

  const doc2User = await User.create({
    name: 'Dr. Priya Desai',
    email: 'dr.priya@telemed.local',
    phone: '+91 9000000003',
    passwordHash: doctorPasswordHash,
    role: 'doctor'
  });
  const doc2 = await Doctor.create({
    userId: doc2User._id,
    specialization: 'Pediatrics',
    hospital: 'Fortis Healthcare',
    verified: false // Demo unverified state for Admin verification testing
  });
  console.log(`[Seed] Created Pending Doctor: ${doc2User.email} (Pediatrics, Fortis - Pending Admin Approval)`);

  // 3. Create 3 Patients
  const patientPasswordHash = await bcrypt.hash('PatientPass123!', 10);

  const p1User = await User.create({
    name: 'Aarav Sharma',
    email: 'aarav@telemed.local',
    phone: '+91 9876543210',
    passwordHash: patientPasswordHash,
    role: 'patient'
  });
  const p1 = await Patient.create({
    userId: p1User._id,
    patientId: 'PT-000001',
    dob: new Date('1994-05-15'),
    gender: 'Male',
    bloodGroup: 'B+',
    allergies: ['Penicillin', 'Peanuts'],
    abhaId: '12-3456-7890-1234',
    emergencyCardEnabled: true
  });
  console.log(`[Seed] Created Patient 1: ${p1User.email} (ID: ${p1.patientId}, Allergies: Penicillin, Peanuts)`);

  const p2User = await User.create({
    name: 'Sonia Patel',
    email: 'sonia@telemed.local',
    phone: '+91 9876543211',
    passwordHash: patientPasswordHash,
    role: 'patient'
  });
  const p2 = await Patient.create({
    userId: p2User._id,
    patientId: 'PT-000002',
    dob: new Date('1992-08-22'),
    gender: 'Female',
    bloodGroup: 'O-',
    allergies: ['Sulfa drugs', 'Latex'],
    emergencyCardEnabled: true
  });
  console.log(`[Seed] Created Patient 2: ${p2User.email} (ID: ${p2.patientId}, Allergies: Sulfa drugs, Latex)`);

  const p3User = await User.create({
    name: 'Rohan Mehra',
    email: 'rohan@telemed.local',
    phone: '+91 9876543212',
    passwordHash: patientPasswordHash,
    role: 'patient'
  });
  const p3 = await Patient.create({
    userId: p3User._id,
    patientId: 'PT-000003',
    dob: new Date('1988-12-01'),
    gender: 'Male',
    bloodGroup: 'A+',
    allergies: [],
    emergencyCardEnabled: true
  });
  console.log(`[Seed] Created Patient 3: ${p3User.email} (ID: ${p3.patientId})`);

  // 4. Create 1 Lab Technician
  const labPasswordHash = await bcrypt.hash('LabPass123!', 10);
  const labUser = await User.create({
    name: 'Apex Diagnostic Lab Technician',
    email: 'lab@telemed.local',
    phone: '+91 9000000004',
    passwordHash: labPasswordHash,
    role: 'lab'
  });
  console.log(`[Seed] Created Lab Technician: ${labUser.email}`);

  // 5. Seed Sample Appointments
  // Appointment A: Confirmed Telehealth Video Session (Tomorrow 10:00 AM)
  const apptConfirmed = await Appointment.create({
    patientId: p1._id,
    doctorId: doc1._id,
    dateTime: new Date(`${tomorrowStr}T10:00:00.000Z`),
    status: 'Confirmed',
    notes: 'Mild chest tightness after exercise, cardiac follow-up'
  });

  // Appointment B: Completed Past Visit with Notes & Prescription for Patient Aarav Sharma
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14);

  const apptCompleted = await Appointment.create({
    patientId: p1._id,
    doctorId: doc1._id,
    dateTime: pastDate,
    status: 'Completed',
    notes: 'Seasonal allergic bronchitis consultation'
  });

  const visit = await Visit.create({
    appointmentId: apptCompleted._id,
    diagnosis: 'Seasonal Allergic Bronchitis',
    notes: 'Chest clear on auscultation. Advised warm saline gargles, avoid cold exposure.'
  });

  const followUp = new Date();
  followUp.setDate(followUp.getDate() + 7);

  await Prescription.create({
    visitId: visit._id,
    medicines: [
      { name: 'Cetirizine 10mg', dosage: '1 tablet once at bedtime', duration: '5 days' },
      { name: 'Montelukast 10mg', dosage: '1 tablet once daily at night', duration: '10 days' },
      { name: 'Paracetamol 650mg', dosage: '1 tablet SOS for body ache', duration: '3 days' }
    ],
    followUpDate: followUp
  });
  console.log('[Seed] Created Completed Visit & Prescription for Patient 1');

  // 6. Seed Sample Diagnostic Report
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const sampleFileKey = 'seed-sample-report.pdf';
  const sampleFilePath = path.join(uploadsDir, sampleFileKey);
  fs.writeFileSync(sampleFilePath, '%PDF-1.4 Mock Diagnostic Pathology Laboratory Test Report Content for Aarav Sharma');

  await Report.create({
    patientId: p1._id,
    uploadedBy: labUser._id,
    title: 'Comprehensive Lipid & Cholesterol Profile',
    type: 'Blood Test',
    fileKey: sampleFileKey,
    originalName: 'Lipid_Profile_Aarav.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    date: pastDate
  });
  console.log('[Seed] Created Diagnostic Report for Patient 1');

  // 7. Seed Sample DPDP Access Log
  await AccessLog.create({
    doctorId: doc1._id,
    patientId: p1._id,
    action: 'VIEW_MEDICAL_HISTORY',
    time: pastDate
  });
  console.log('[Seed] Created DPDP Access Log entry');

  console.log('\n======================================================');
  console.log(' SEEDING COMPLETED SUCCESSFULLY! DEMO CREDENTIALS:');
  console.log('======================================================');
  console.log('1. Admin:       admin@telemed.local       / AdminPass123!');
  console.log('2. Doctor (V):  dr.sharma@telemed.local   / DoctorPass123!');
  console.log('3. Doctor (U):  dr.priya@telemed.local    / DoctorPass123!');
  console.log('4. Patient 1:   aarav@telemed.local       / PatientPass123! (PT-000001)');
  console.log('5. Patient 2:   sonia@telemed.local       / PatientPass123! (PT-000002)');
  console.log('6. Patient 3:   rohan@telemed.local       / PatientPass123! (PT-000003)');
  console.log('7. Lab Tech:    lab@telemed.local         / LabPass123!');
  console.log('======================================================\n');

  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
