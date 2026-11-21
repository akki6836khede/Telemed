import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required']
    },
    allergies: {
      type: [String],
      default: []
    },
    abhaId: {
      type: String,
      trim: true,
      default: ''
    },
    // Emergency QR card secure unguessable access token
    emergencyToken: {
      type: String,
      unique: true,
      default: () => uuidv4()
    },
    emergencyCardEnabled: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
