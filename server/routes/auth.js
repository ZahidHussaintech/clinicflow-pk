import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ClinicUser from '../models/ClinicUser.js';
import DispensaryItem from '../models/DispensaryItem.js';
import { requireClinicAuth } from '../middleware/auth.js';

const router = express.Router();

const signToken = (clinicId) =>
  jwt.sign({ clinicId }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  try {
    const { doctorName, clinicName, areaSector, phone, password, defaultFeeRs } = req.body;
    if (!doctorName || !clinicName || !phone || !password) {
      return res.status(400).json({ message: 'Doctor name, clinic name, mobile number, and password are required.' });
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const exists = await ClinicUser.findOne({ phone: cleanPhone });
    if (exists) {
      return res.status(409).json({ message: 'This mobile number is already registered. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const clinic = await ClinicUser.create({
      doctorName,
      clinicName,
      areaSector: areaSector || 'Sector 5C-1, North Karachi',
      phone: cleanPhone,
      passwordHash,
      defaultFeeRs: Number(defaultFeeRs) || 400,
    });

    await DispensaryItem.insertMany([
      { clinicId: clinic._id, itemName: 'Panadol Syrup 60ml', category: 'Syrup', stockQty: 18, lowStockThreshold: 8, expiryDate: '2027-08-15', unitPriceRs: 120 },
      { clinicId: clinic._id, itemName: 'Voren 75mg Injection', category: 'Injection', stockQty: 7, lowStockThreshold: 10, expiryDate: '2027-05-01', unitPriceRs: 150 },
      { clinicId: clinic._id, itemName: 'Amoxil 500mg Capsules (Box)', category: 'Antibiotic', stockQty: 25, lowStockThreshold: 10, expiryDate: '2027-11-20', unitPriceRs: 220 },
      { clinicId: clinic._id, itemName: 'Disposable Syringe 5cc', category: 'Dispensary', stockQty: 9, lowStockThreshold: 15, expiryDate: '2028-01-10', unitPriceRs: 40 },
    ]);

    const token = signToken(clinic._id);
    res.status(201).json({
      token,
      clinic: {
        id: clinic._id,
        doctorName: clinic.doctorName,
        clinicName: clinic.clinicName,
        areaSector: clinic.areaSector,
        phone: clinic.phone,
        defaultFeeRs: clinic.defaultFeeRs,
        presetMedicines: clinic.presetMedicines,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: 'Mobile number and password are required.' });
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    const clinic = await ClinicUser.findOne({ phone: cleanPhone });
    if (!clinic) {
      return res.status(401).json({ message: 'Invalid mobile number or password.' });
    }
    const valid = await bcrypt.compare(password, clinic.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid mobile number or password.' });
    }
    const token = signToken(clinic._id);
    res.json({
      token,
      clinic: {
        id: clinic._id,
        doctorName: clinic.doctorName,
        clinicName: clinic.clinicName,
        areaSector: clinic.areaSector,
        phone: clinic.phone,
        defaultFeeRs: clinic.defaultFeeRs,
        presetMedicines: clinic.presetMedicines,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

router.get('/me', requireClinicAuth, async (req, res) => {
  try {
    const clinic = await ClinicUser.findById(req.clinicId).select('-passwordHash');
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    res.json({
      id: clinic._id,
      doctorName: clinic.doctorName,
      clinicName: clinic.clinicName,
      areaSector: clinic.areaSector,
      phone: clinic.phone,
      defaultFeeRs: clinic.defaultFeeRs,
      presetMedicines: clinic.presetMedicines,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile.' });
  }
});

export default router;
