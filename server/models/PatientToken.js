import mongoose from 'mongoose';

const patientTokenSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicUser', required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD (PKT)
    tokenNumber: { type: Number, required: true },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, required: true, trim: true, index: true },
    ageGender: { type: String, default: '', trim: true },
    complaint: { type: String, default: 'General Checkup', trim: true },
    status: {
      type: String,
      enum: ['Waiting', 'In Consultation', 'Completed', 'Skipped'],
      default: 'Waiting',
    },
    vitals: {
      bp: { type: String, default: '' },
      temp: { type: String, default: '' },
      sugar: { type: String, default: '' },
      weight: { type: String, default: '' },
    },
    diagnosis: { type: String, default: '' },
    prescription: { type: [String], default: [] },
    followUpDays: { type: Number, default: 0 },
    consultationFeeRs: { type: Number, default: 400, min: 0 },
    procedureFeeRs: { type: Number, default: 0, min: 0 }, // Injection / Drip / Nebulizer
    procedureNote: { type: String, default: '' },
    paymentCollected: { type: Boolean, default: true },
  },
  { timestamps: true }
);

patientTokenSchema.index({ clinicId: 1, dateKey: 1, tokenNumber: 1 });
patientTokenSchema.index({ clinicId: 1, patientPhone: 1, createdAt: -1 });

export default mongoose.model('PatientToken', patientTokenSchema);
