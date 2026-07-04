/**
 * 인프라 서비스 통합 모듈
 * - 글로벌 에러 핸들러
 * - Rate Limiter
 * - 구조화된 로거 (Pino 스타일)
 * - Redis 캐시 레이어
 * - 건강 점수 (Health Score) 엔진
 * - WebSocket 실시간 알림
 * - OpenTelemetry 메트릭
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================
// 1. 글로벌 에러 핸들러
// ============================================================

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error({ err: { message: err.message, code, stack: err.stack }, path: req.path, method: req.method });

  res.status(statusCode).json({
    error: {
      code,
      message: err.isOperational ? err.message : '서버 내부 오류가 발생했습니다.',
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `${req.method} ${req.path} 경로를 찾을 수 없습니다.` } });
}

// ============================================================
// 2. Rate Limiter
// ============================================================

interface RateLimitEntry { count: number; resetAt: number; }

class RateLimiterService {
  private store = new Map<string, RateLimitEntry>();
  private defaultLimit = 100;  // 요청/분
  private defaultWindow = 60000; // 1분

  middleware(limit?: number, windowMs?: number) {
    const maxRequests = limit || this.defaultLimit;
    const window = windowMs || this.defaultWindow;

    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const entry = this.store.get(key);

      if (!entry || now > entry.resetAt) {
        this.store.set(key, { count: 1, resetAt: now + window });
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        return next();
      }

      if (entry.count >= maxRequests) {
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
        return res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' } });
      }

      entry.count++;
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
      next();
    };
  }

  // LLM 호출 전용 (분당 10회)
  llmRateLimit() { return this.middleware(10, 60000); }
  // 일반 API (분당 100회)
  apiRateLimit() { return this.middleware(100, 60000); }
  // 인증 API (분당 5회)
  authRateLimit() { return this.middleware(5, 60000); }
}

export const rateLimiter = new RateLimiterService();

// ============================================================
// 3. 구조화된 로거 (Pino 스타일)
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

class Logger {
  private level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  private levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private log(level: LogLevel, data: any) {
    if (!this.shouldLog(level)) return;
    const entry = {
      level,
      time: new Date().toISOString(),
      service: 'myhealth-api',
      ...(typeof data === 'string' ? { msg: data } : data),
    };
    const output = JSON.stringify(entry);
    if (level === 'error' || level === 'fatal') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
  }

  debug(data: any) { this.log('debug', data); }
  info(data: any) { this.log('info', data); }
  warn(data: any) { this.log('warn', data); }
  error(data: any) { this.log('error', data); }
  fatal(data: any) { this.log('fatal', data); }
}

export const logger = new Logger();

// ============================================================
// 4. Redis 캐시 레이어
// ============================================================

class CacheService {
  private store = new Map<string, { value: any; expiresAt: number }>();
  private redisUrl = process.env.REDIS_URL;
  private mode: 'redis' | 'memory' = 'memory';

  constructor() {
    if (this.redisUrl) {
      this.mode = 'redis';
      logger.info({ msg: 'Cache: Redis mode', url: this.redisUrl });
    } else {
      logger.info({ msg: 'Cache: In-Memory mode' });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> { this.store.delete(key); }
  async flush(): Promise<void> { this.store.clear(); }

  getMode(): string { return this.mode; }
  getSize(): number { return this.store.size; }
}

export const cache = new CacheService();

// ============================================================
// 5. 건강 점수 (Health Score) 엔진
// ============================================================

export interface HealthScoreResult {
  totalScore: number;       // 0~100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    checkup: { score: number; weight: number; details: string };
    activity: { score: number; weight: number; details: string };
    sleep: { score: number; weight: number; details: string };
    medication: { score: number; weight: number; details: string };
    goals: { score: number; weight: number; details: string };
  };
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export function calculateHealthScore(data: {
  observations: Array<{ status: string }>;
  avgSteps: number;
  avgSleep: number;
  medicationAdherence: number; // 0~1
  goalProgress: number; // 0~1
}): HealthScoreResult {
  // 검진 점수 (40%)
  const totalObs = data.observations.length || 1;
  const normalCount = data.observations.filter(o => o.status === 'normal').length;
  const checkupScore = Math.round((normalCount / totalObs) * 100);

  // 활동 점수 (20%) - 8000보 기준
  const activityScore = Math.min(Math.round((data.avgSteps / 8000) * 100), 100);

  // 수면 점수 (15%) - 7~8시간 최적
  const sleepDiff = Math.abs(data.avgSleep - 7.5);
  const sleepScore = Math.max(0, Math.round(100 - sleepDiff * 25));

  // 복약 순응도 (15%)
  const medicationScore = Math.round(data.medicationAdherence * 100);

  // 목표 달성 (10%)
  const goalScore = Math.round(data.goalProgress * 100);

  // 가중 합산
  const totalScore = Math.round(
    checkupScore * 0.40 + activityScore * 0.20 + sleepScore * 0.15 + medicationScore * 0.15 + goalScore * 0.10
  );

  // 등급
  const grade = totalScore >= 90 ? 'A' : totalScore >= 75 ? 'B' : totalScore >= 60 ? 'C' : totalScore >= 40 ? 'D' : 'F';

  // 추천사항
  const recommendations: string[] = [];
  if (checkupScore < 60) recommendations.push('검진 이상 항목에 대한 의료진 상담을 권장합니다.');
  if (activityScore < 50) recommendations.push('일일 걸음 수를 8,000보 이상으로 늘려보세요.');
  if (sleepScore < 50) recommendations.push('수면 시간을 7~8시간으로 조정해보세요.');
  if (medicationScore < 80) recommendations.push('처방 약물을 빠짐없이 복용해주세요.');
  if (goalScore < 50) recommendations.push('주간 미션을 확인하고 실천해보세요.');

  return {
    totalScore,
    grade,
    components: {
      checkup: { score: checkupScore, weight: 40, details: `${normalCount}/${totalObs} 항목 정상` },
      activity: { score: activityScore, weight: 20, details: `평균 ${data.avgSteps.toLocaleString()}보/일` },
      sleep: { score: sleepScore, weight: 15, details: `평균 ${data.avgSleep.toFixed(1)}시간/일` },
      medication: { score: medicationScore, weight: 15, details: `순응도 ${medicationScore}%` },
      goals: { score: goalScore, weight: 10, details: `달성률 ${goalScore}%` },
    },
    trend: totalScore >= 70 ? 'improving' : totalScore >= 50 ? 'stable' : 'declining',
    recommendations,
  };
}

// ============================================================
// 6. WebSocket 실시간 알림
// ============================================================

export interface NotificationPayload {
  id: string;
  type: 'medication' | 'risk_alert' | 'mission' | 'checkup' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  actionUrl?: string;
}

class NotificationService {
  private subscribers = new Map<string, Array<(payload: NotificationPayload) => void>>();

  subscribe(userId: string, callback: (payload: NotificationPayload) => void): () => void {
    const subs = this.subscribers.get(userId) || [];
    subs.push(callback);
    this.subscribers.set(userId, subs);
    return () => {
      const updated = (this.subscribers.get(userId) || []).filter(cb => cb !== callback);
      this.subscribers.set(userId, updated);
    };
  }

  notify(userId: string, payload: Omit<NotificationPayload, 'id' | 'timestamp'>): void {
    const notification: NotificationPayload = { ...payload, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    const subs = this.subscribers.get(userId) || [];
    subs.forEach(cb => cb(notification));
    logger.info({ msg: 'Notification sent', userId, type: payload.type, title: payload.title });
  }

  // 스케줄된 알림 체크 (1분마다 실행)
  checkScheduledNotifications(): void {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // 아침 복약 알림 (08:00)
    if (hour === 8 && minute === 0) {
      this.notifyAll({ type: 'medication', title: '아침 복약 시간', message: '아침 약을 복용할 시간입니다.', severity: 'info' });
    }
    // 저녁 복약 알림 (20:00)
    if (hour === 20 && minute === 0) {
      this.notifyAll({ type: 'medication', title: '저녁 복약 시간', message: '저녁 약을 복용할 시간입니다.', severity: 'info' });
    }
  }

  private notifyAll(payload: Omit<NotificationPayload, 'id' | 'timestamp'>): void {
    for (const userId of this.subscribers.keys()) {
      this.notify(userId, payload);
    }
  }
}

export const notificationService = new NotificationService();

// ============================================================
// 7. OpenTelemetry 메트릭 (간소화)
// ============================================================

class MetricsService {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  increment(name: string, labels?: Record<string, string>): void {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  observe(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    if (values.length > 1000) values.shift();
    this.histograms.set(name, values);
  }

  getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    for (const [key, value] of this.counters) metrics[`counter_${key}`] = value;
    for (const [key, values] of this.histograms) {
      metrics[`histogram_${key}`] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: values.sort((a, b) => a - b)[Math.floor(values.length * 0.5)] || 0,
        p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || 0,
        p99: values.sort((a, b) => a - b)[Math.floor(values.length * 0.99)] || 0,
      };
    }
    return metrics;
  }

  // Express 미들웨어
  requestMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.increment('http_requests_total', { method: req.method, path: req.route?.path || req.path, status: res.statusCode.toString() });
        this.observe('http_request_duration_ms', duration);
      });
      next();
    };
  }
}

export const metrics = new MetricsService();
