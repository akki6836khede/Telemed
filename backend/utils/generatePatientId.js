import Counter from '../models/Counter.js';

export const getNextPatientId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { id: 'patientId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedNum = String(counter.seq).padStart(6, '0');
  return `PT-${paddedNum}`;
};
