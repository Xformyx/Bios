import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { consentRouter } from './routes/consent.js';
import { healthDataRouter } from './routes/healthData.js';
import { wearableRouter } from './routes/wearable.js';
import { aiCoachRouter } from './routes/aiCoach.js';
import { reportRouter } from './routes/report.js';
import { auditRouter } from './routes/audit.js';
import { uploadRouter } from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/consent', consentRouter);
app.use('/api/health-data', healthDataRouter);
app.use('/api/wearable', wearableRouter);
app.use('/api/ai-coach', aiCoachRouter);
app.use('/api/report', reportRouter);
app.use('/api/audit', auditRouter);
app.use('/api/upload', uploadRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MyHealth Market Lite API' });
});

app.listen(PORT, () => {
  console.log(`[MyHealth API] Server running on port ${PORT}`);
});

export default app;
