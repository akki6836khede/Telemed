import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID reference is required'],
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID reference is required'],
      index: true
    },
    dateTime: {
      type: Date,
      required: [true, 'Appointment date and time is required']
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    meetingLink: {
      type: String,
      default: () => `https://meet.jit.si/telehealth-${uuidv4()}`
    },
    meetingRoom: {
      type: String,
      default: () => `telehealth-${uuidv4()}`
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent double booking at the database level:
// Compound index ensures a doctor cannot have two active appointments at the exact same dateTime.
appointmentSchema.index(
  { doctorId: 1, dateTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['Pending', 'Confirmed'] } }
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
