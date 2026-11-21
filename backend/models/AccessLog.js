import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        'LOOKUP_BASIC_PROFILE',
        'VIEW_MEDICAL_HISTORY',
        'VIEW_LAB_REPORTS',
        'DOWNLOAD_REPORT_PDF'
      ],
      required: true
    },
    time: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const AccessLog = mongoose.model('AccessLog', accessLogSchema);
export default AccessLog;
