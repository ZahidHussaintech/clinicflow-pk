import mongoose from 'mongoose';

const clinicUserSchema = new mongoose.Schema(
  {
    doctorName: { type: String, required: true, trim: true },
    clinicName: { type: String, required: true, trim: true },
    areaSector: { type: String, default: 'Sector 5C-1, North Karachi', trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    defaultFeeRs: { type: Number, default: 400, min: 0 },
    subscriptionPlan: { type: String, default: 'Pro Clinic (Rs. 2,500/mo)' },
    presetMedicines: {
      type: [String],
      default: [
        'Tab. Panadol 500mg (1+1+1 x 3 days)',
        'Cap. Amoxil 500mg (1+0+1 x 5 days)',
        'Tab. Brufen 400mg (1+0+1 after meal)',
        'Syp. Calpol 120mg (1 tsp TDS)',
        'Tab. Risek 20mg (1 OD before breakfast)',
        'Inj. Voren 75mg IM Stat',
        'Normal Saline Drip 500ml IV',
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model('ClinicUser', clinicUserSchema);
