import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import clinicRoutes from './routes/clinic.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection error.', error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ClinicFlow PK API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clinic', clinicRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`ClinicFlow PK API running on port ${PORT}`));
}

export default app;
