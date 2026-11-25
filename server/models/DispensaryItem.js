import mongoose from 'mongoose';

const dispensaryItemSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicUser', required: true, index: true },
    itemName: { type: String, required: true, trim: true },
    category: { type: String, default: 'Tablet / Syrup', trim: true },
    stockQty: { type: Number, required: true, default: 20, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 1 },
    expiryDate: { type: String, default: '' },
    unitPriceRs: { type: Number, default: 50, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('DispensaryItem', dispensaryItemSchema);
