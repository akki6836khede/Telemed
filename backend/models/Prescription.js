import mongoose from 'mongoose';

const medicineItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  dosage: {
    type: String,
    required: [true, 'Dosage instructions are required (e.g. 500mg once daily)'],
    trim: true
  },
  duration: {
    type: String,
    required: [true, 'Duration is required (e.g. 5 days)'],
    trim: true
  }
});

const prescriptionSchema = new mongoose.Schema(
  {
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      required: true,
      unique: true
    },
    medicines: {
      type: [medicineItemSchema],
      default: []
    },
    followUpDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
