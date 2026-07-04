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
import { myhealthwayRouter } from './routes/myhealthway.js';
import { settingsRouter } from './routes/settings.js';
import { identityRouter } from './routes/identity.js';
import { extendedRouter } from './routes/extended.js';
import { genomicRouter } from './routes/genomic.js';

import { globalErrorHandler, notFoundHandler, rateLimiter, logger, metrics, cache } from './services/infrastructure.js';
import { database } from './services/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metrics.requestMetrics());
app.use(rateLimiter.apiRateLimit());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/consent', consentRouter);
app.use('/api/health-data', healthDataRouter);
app.use('/api/wearable', wearableRouter);
app.use('/api/ai-coach', aiCoachRouter);
app.use('/api/report', reportRouter);
app.use('/api/audit', auditRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/myhealthway', myhealthwayRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/identity', identityRouter);
app.use('/api/ext', extendedRouter);
app.use('/api/genomic', genomicRouter);

// Health check
app.get('/api/health', async (req, res) => {
  const dbHealth = await database.healthCheck();
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MyHealth Market Lite API', database: dbHealth, cache: { mode: cache.getMode(), size: cache.getSize() } });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => { res.json(metrics.getMetrics()); });

// 404 핸들러
app.use(notFoundHandler);

// 글로벌 에러 핸들러
app.use(globalErrorHandler);

app.listen(PORT, async () => {
  await database.connect();
  logger.info({ msg: `MyHealth API Server running on port ${PORT}`, port: PORT, env: process.env.NODE_ENV || 'development' });
});

export default app;
