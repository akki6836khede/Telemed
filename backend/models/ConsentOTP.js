import mongoose from 'mongoose';

const consentOTPSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '24h' } // Auto-cleanup expired documents
    },
    approved: {
      type: Boolean,
      default: false
    },
    approvedUntil: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const ConsentOTP = mongoose.model('ConsentOTP', consentOTPSchema);
export default ConsentOTP;
