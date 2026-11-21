import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  startTime: {
    type: String, // HH:mm
    required: true
  },
  endTime: {
    type: String, // HH:mm
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  }
});

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true
    },
    hospital: {
      type: String,
      required: [true, 'Hospital or clinic affiliation is required'],
      trim: true
    },
    verified: {
      type: Boolean,
      default: false,
      index: true
    },
    slots: {
      type: [slotSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
