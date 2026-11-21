import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['Blood Test', 'Radiology / X-Ray', 'MRI / CT Scan', 'Pathology', 'Ultrasound', 'Other'],
      default: 'Blood Test'
    },
    fileKey: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const Report = mongoose.model('Report', reportSchema);
export default Report;
