import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ClinicUser from '../models/ClinicUser.js';
import PatientToken from '../models/PatientToken.js';
import DispensaryItem from '../models/DispensaryItem.js';
import { requireClinicAuth } from '../middleware/auth.js';

const router = express.Router();

const SUPER_ADMIN_PHONES = ['03379814592', '923379814592', '03462228005', '923462228005'];

function isSuperAdminPhone(phone) {
  const clean = String(phone || '').replace(/\D/g, '');
  return SUPER_ADMIN_PHONES.some((p) => clean.endsWith(p.slice(-10)));
}

function signToken(clinicId) {
  return jwt.sign({ clinicId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function formatClinicPayload(user) {
  return {
    id: user._id,
    doctorName: user.doctorName,
    clinicName: user.clinicName,
    areaSector: user.areaSector,
    phone: user.phone,
    defaultFeeRs: user.defaultFeeRs,
    presetMedicines: user.presetMedicines,
    subscriptionStatus: user.subscriptionStatus || 'trial',
    subscriptionEndsAt: user.subscriptionEndsAt,
    isSuperAdmin: isSuperAdminPhone(user.phone),
  };
}

router.post('/register', async (req, res) => {
  try {
    const { doctorName, clinicName, areaSector, phone, password, defaultFeeRs } = req.body;
    if (!doctorName || !clinicName || !phone || !password) {
      return res.status(400).json({ message: 'Doctor name, clinic name, mobile number, and password are required.' });
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const existing = await ClinicUser.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(409).json({ message: 'This mobile number is already registered. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await ClinicUser.create({
      doctorName,
      clinicName,
      areaSector: areaSector || 'North Karachi',
      phone: cleanPhone,
      passwordHash,
      defaultFeeRs: Number(defaultFeeRs) || 400,
    });

    await DispensaryItem.insertMany([
      { clinicId: user._id, itemName: 'Panadol Syrup 60ml', category: 'Syrup', stockQty: 18, lowStockThreshold: 8, expiryDate: '2027-06-30', unitPriceRs: 120 },
      { clinicId: user._id, itemName: 'Voren 75mg Injection', category: 'Injection', stockQty: 7, lowStockThreshold: 10, expiryDate: '2026-12-15', unitPriceRs: 90 },
      { clinicId: user._id, itemName: 'Amoxil 500mg Capsules (Box)', category: 'Antibiotic', stockQty: 25, lowStockThreshold: 10, expiryDate: '2027-09-20', unitPriceRs: 320 },
      { clinicId: user._id, itemName: 'Disposable Syringe 5cc', category: 'Dispensary', stockQty: 9, lowStockThreshold: 15, expiryDate: '2028-01-10', unitPriceRs: 25 },
    ]);

    const token = signToken(user._id);
    res.status(201).json({ token, clinic: formatClinicPayload(user) });
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
    const user = await ClinicUser.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(401).json({ message: 'Invalid mobile number or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid mobile number or password.' });
    }

    if (!isSuperAdminPhone(user.phone)) {
      if (user.subscriptionStatus === 'paused') {
        return res.status(403).json({
          message: 'Clinic account is paused. WhatsApp +92 337 9814592 to activate.',
        });
      }
      if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) < new Date()) {
        return res.status(403).json({
          message: 'Your 7-day trial / plan has expired. WhatsApp +92 337 9814592 to renew.',
        });
      }
    }

    const token = signToken(user._id);
    res.json({ token, clinic: formatClinicPayload(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// Master Recovery Key Password Reset (for Super Admin or on-site reset)
router.post('/reset-with-master-key', async (req, res) => {
  try {
    const { phone, masterKey, newPassword } = req.body;
    const expectedKey = process.env.MASTER_RESET_KEY || 'zahid786';
    if (!phone || !masterKey || !newPassword) {
      return res.status(400).json({ message: 'Mobile number, Master Key, and new password are required.' });
    }
    if (masterKey !== expectedKey) {
      return res.status(403).json({ message: 'Invalid Master Recovery Key.' });
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = await ClinicUser.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({ message: 'No clinic registered with this mobile number.' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated! You can now sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset failed.' });
  }
});

router.get('/me', requireClinicAuth, async (req, res) => {
  try {
    const user = await ClinicUser.findById(req.clinicId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'Clinic not found' });
    res.json(formatClinicPayload(user));
  } catch (err) {
    res.status(500).json({ message: 'Profile fetch error' });
  }
});

// SUPER ADMIN: List all registered clinics with token & revenue stats
router.get('/admin/clinics', requireClinicAuth, async (req, res) => {
  try {
    const me = await ClinicUser.findById(req.clinicId).lean();
    if (!me || !isSuperAdminPhone(me.phone)) {
      return res.status(403).json({ message: 'Super Admin access only.' });
    }

    const [clinics, tokenStats] = await Promise.all([
      ClinicUser.find().select('-passwordHash').sort({ createdAt: -1 }).lean(),
      PatientToken.aggregate([
        {
          $group: {
            _id: '$clinicId',
            totalTokens: { $sum: 1 },
            totalRevenueRs: {
              $sum: { $add: [{ $ifNull: ['$consultationFeeRs', 0] }, { $ifNull: ['$procedureFeeRs', 0] }] },
            },
          },
        },
      ]),
    ]);

    const statsMap = new Map(tokenStats.map((s) => [String(s._id), s]));
    const enriched = clinics.map((c) => {
      const st = statsMap.get(String(c._id)) || { totalTokens: 0, totalRevenueRs: 0 };
      return {
        ...c,
        totalTokens: st.totalTokens,
        totalRevenueRs: st.totalRevenueRs,
        isSuperAdmin: isSuperAdminPhone(c.phone),
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load admin clinics.' });
  }
});

// SUPER ADMIN: Extend Subscription (+30 / +180 days), Pause, or Reset Clinic Password
router.put('/admin/clinics/:id', requireClinicAuth, async (req, res) => {
  try {
    const me = await ClinicUser.findById(req.clinicId).lean();
    if (!me || !isSuperAdminPhone(me.phone)) {
      return res.status(403).json({ message: 'Super Admin access only.' });
    }

    const target = await ClinicUser.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Clinic not found.' });

    const { addDays, subscriptionStatus, newPassword } = req.body;
    if (addDays) {
      const base =
        target.subscriptionEndsAt && new Date(target.subscriptionEndsAt) > new Date()
          ? new Date(target.subscriptionEndsAt)
          : new Date();
      target.subscriptionEndsAt = new Date(base.getTime() + Number(addDays) * 24 * 60 * 60 * 1000);
      target.subscriptionStatus = 'active';
    }
    if (subscriptionStatus) {
      target.subscriptionStatus = subscriptionStatus;
    }
    if (newPassword && newPassword.trim().length >= 4) {
      target.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    await target.save();
    res.json({ message: 'Clinic updated successfully.', clinic: formatClinicPayload(target) });
  } catch (err) {
    res.status(500).json({ message: 'Admin update failed.' });
  }
});

export default router;
