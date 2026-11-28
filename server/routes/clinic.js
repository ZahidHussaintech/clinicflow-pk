import express from 'express';
import PatientToken from '../models/PatientToken.js';
import DispensaryItem from '../models/DispensaryItem.js';
import ClinicUser from '../models/ClinicUser.js';
import { requireClinicAuth } from '../middleware/auth.js';

const router = express.Router();

function getTodayPKT() {
  const pkt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return pkt.toISOString().slice(0, 10);
}

// PUBLIC: Patient Online Token Booking Info (No Login Required)
router.get('/public/:clinicId', async (req, res) => {
  try {
    const clinic = await ClinicUser.findById(req.params.clinicId).select(
      'clinicName doctorName areaSector defaultFeeRs'
    );
    if (!clinic) return res.status(404).json({ message: 'Clinic link not found.' });

    const dateKey = getTodayPKT();
    const tokens = await PatientToken.find({ clinicId: clinic._id, dateKey });
    const waitingCount = tokens.filter((t) => t.status === 'Waiting').length;
    const nextTokenNumber = tokens.length > 0 ? Math.max(...tokens.map((t) => t.tokenNumber)) + 1 : 1;

    res.json({
      clinic,
      dateKey,
      waitingCount,
      nextTokenNumber,
    });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load clinic booking page.' });
  }
});

// PUBLIC: Patient Books Token From Home (No Login Required)
router.post('/public/:clinicId/book', async (req, res) => {
  try {
    const { patientName, patientPhone, complaint } = req.body;
    if (!patientName || !patientPhone) {
      return res.status(400).json({ message: 'Name and mobile number are required.' });
    }

    const clinic = await ClinicUser.findById(req.params.clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const dateKey = getTodayPKT();
    const lastToken = await PatientToken.findOne({ clinicId: clinic._id, dateKey }).sort({ tokenNumber: -1 });
    const nextNumber = lastToken ? lastToken.tokenNumber + 1 : 1;
    const waitingAhead = await PatientToken.countDocuments({
      clinicId: clinic._id,
      dateKey,
      status: 'Waiting',
    });

    const created = await PatientToken.create({
      clinicId: clinic._id,
      dateKey,
      tokenNumber: nextNumber,
      patientName: patientName.trim(),
      patientPhone: patientPhone.replace(/\s+/g, ''),
      complaint: complaint || 'Online Booking',
      consultationFeeRs: clinic.defaultFeeRs ?? 400,
      procedureFeeRs: 0,
      procedureNote: 'Booked Online From Home',
    });

    res.status(201).json({
      token: created,
      waitingAhead,
      clinicName: clinic.clinicName,
      areaSector: clinic.areaSector,
    });
  } catch (err) {
    res.status(500).json({ message: 'Online booking failed.', error: err.message });
  }
});

// PROTECTED: Get Queue & Cash Summary for Selected Date (or Today) + All-Time Totals
router.get('/today', requireClinicAuth, async (req, res) => {
  try {
    const dateKey = req.query.date || getTodayPKT();
    const tokens = await PatientToken.find({ clinicId: req.clinicId, dateKey }).sort({ tokenNumber: 1 });

    const totalPatients = tokens.length;
    const waitingCount = tokens.filter((t) => t.status === 'Waiting').length;
    const completedCount = tokens.filter((t) => t.status === 'Completed').length;
    const totalConsultationRs = tokens.reduce((sum, t) => sum + (t.consultationFeeRs || 0), 0);
    const totalProcedureRs = tokens.reduce((sum, t) => sum + (t.procedureFeeRs || 0), 0);
    const grandTotalRs = totalConsultationRs + totalProcedureRs;

    const allTokens = await PatientToken.find({ clinicId: req.clinicId }).select(
      'consultationFeeRs procedureFeeRs dateKey'
    );
    const allTimePatients = allTokens.length;
    const allTimeRevenueRs = allTokens.reduce(
      (sum, t) => sum + (t.consultationFeeRs || 0) + (t.procedureFeeRs || 0),
      0
    );

    res.json({
      dateKey,
      todayPKT: getTodayPKT(),
      tokens,
      summary: {
        totalPatients,
        waitingCount,
        completedCount,
        totalConsultationRs,
        totalProcedureRs,
        grandTotalRs,
        allTimePatients,
        allTimeRevenueRs,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load queue.', error: err.message });
  }
});

router.post('/tokens', requireClinicAuth, async (req, res) => {
  try {
    const {
      patientName,
      patientPhone,
      ageGender,
      complaint,
      consultationFeeRs,
      procedureFeeRs,
      procedureNote,
    } = req.body;

    if (!patientName || !patientPhone) {
      return res.status(400).json({ message: 'Patient name and mobile number are required.' });
    }

    const dateKey = getTodayPKT();
    const lastToken = await PatientToken.findOne({ clinicId: req.clinicId, dateKey }).sort({ tokenNumber: -1 });
    const nextNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

    const clinic = await ClinicUser.findById(req.clinicId);
    const fee = consultationFeeRs !== undefined ? Number(consultationFeeRs) : clinic?.defaultFeeRs ?? 400;

    const created = await PatientToken.create({
      clinicId: req.clinicId,
      dateKey,
      tokenNumber: nextNumber,
      patientName: patientName.trim(),
      patientPhone: patientPhone.replace(/\s+/g, ''),
      ageGender: ageGender || '',
      complaint: complaint || 'General Checkup',
      consultationFeeRs: fee,
      procedureFeeRs: Number(procedureFeeRs) || 0,
      procedureNote: procedureNote || '',
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Failed to issue token.', error: err.message });
  }
});

router.put('/tokens/:id', requireClinicAuth, async (req, res) => {
  try {
    const existing = await PatientToken.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!existing) return res.status(404).json({ message: 'Token not found.' });

    const incomingIds = Array.isArray(req.body.dispensedItemIds) ? req.body.dispensedItemIds : [];
    const alreadyDeducted = Array.isArray(existing.dispensedItemIds) ? existing.dispensedItemIds : [];

    const newlyAddedIds = incomingIds.filter((id) => !alreadyDeducted.includes(id));
    for (const itemId of newlyAddedIds) {
      await DispensaryItem.findOneAndUpdate(
        { _id: itemId, clinicId: req.clinicId, stockQty: { $gt: 0 } },
        { $inc: { stockQty: -1 } }
      );
    }

    const mergedIds = Array.from(new Set([...alreadyDeducted, ...incomingIds]));
    const updated = await PatientToken.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      { ...req.body, dispensedItemIds: mergedIds },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update patient record.' });
  }
});

router.get('/history/:phone', requireClinicAuth, async (req, res) => {
  try {
    const cleanPhone = req.params.phone.replace(/\s+/g, '');
    const visits = await PatientToken.find({
      clinicId: req.clinicId,
      patientPhone: { $regex: cleanPhone.slice(-10) },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ phone: cleanPhone, visits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch patient history.' });
  }
});

router.get('/dispensary', requireClinicAuth, async (req, res) => {
  try {
    const items = await DispensaryItem.find({ clinicId: req.clinicId }).sort({ stockQty: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load dispensary stock.' });
  }
});

router.post('/dispensary', requireClinicAuth, async (req, res) => {
  try {
    const created = await DispensaryItem.create({
      clinicId: req.clinicId,
      ...req.body,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add dispensary item.' });
  }
});

router.put('/dispensary/:id', requireClinicAuth, async (req, res) => {
  try {
    const updated = await DispensaryItem.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update stock.' });
  }
});

router.delete('/dispensary/:id', requireClinicAuth, async (req, res) => {
  try {
    await DispensaryItem.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete stock item.' });
  }
});

export default router;
