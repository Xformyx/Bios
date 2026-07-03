import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const wearableRouter = Router();
wearableRouter.use(authenticateToken);

// 웨어러블 데이터 조회
wearableRouter.get('/', (req: AuthRequest, res: Response) => {
  const { days = '7', source } = req.query;
  let data = store.wearableData.get(req.userId!) || [];

  if (source) {
    data = data.filter(d => d.source === source);
  }

  // 최근 N일 데이터
  const daysNum = parseInt(days as string, 10);
  data = data.slice(-daysNum);

  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'WearableData', details: `웨어러블 데이터 조회 (${daysNum}일)` });
  res.json(data);
});

// 웨어러블 데이터 수동 입력
wearableRouter.post('/', (req: AuthRequest, res: Response) => {
  const { date, steps, sleepHours, heartRateAvg, activeMinutes, weight, bloodPressureSystolic, bloodPressureDiastolic, bloodGlucose } = req.body;

  const entry = {
    id: crypto.randomUUID(),
    userId: req.userId!,
    source: 'manual' as const,
    date: date || new Date().toISOString().split('T')[0],
    steps,
    sleepHours,
    heartRateAvg,
    activeMinutes,
    weight,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    bloodGlucose,
  };

  const data = store.wearableData.get(req.userId!) || [];
  data.push(entry);
  store.wearableData.set(req.userId!, data);

  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'WearableData', resourceId: entry.id, details: '웨어러블 데이터 수동 입력' });
  res.status(201).json(entry);
});

// 웨어러블 연동 상태
wearableRouter.get('/connections', (req: AuthRequest, res: Response) => {
  // MVP에서는 시뮬레이션된 연동 상태 반환
  res.json({
    connections: [
      { source: 'apple_health', name: 'Apple Health', connected: true, lastSync: new Date().toISOString(), dataTypes: ['steps', 'sleep', 'heartRate', 'activeMinutes'] },
      { source: 'google_health', name: 'Google Health Connect', connected: false, lastSync: null, dataTypes: [] },
      { source: 'samsung_health', name: 'Samsung Health', connected: false, lastSync: null, dataTypes: [] },
    ],
  });
});

// 웨어러블 트렌드 분석
wearableRouter.get('/trends', (req: AuthRequest, res: Response) => {
  const data = store.wearableData.get(req.userId!) || [];
  const recent = data.slice(-30);

  if (recent.length < 2) {
    return res.json({ trends: [], message: '트렌드 분석을 위한 데이터가 부족합니다.' });
  }

  const calcTrend = (values: number[]): 'improving' | 'stable' | 'worsening' => {
    if (values.length < 2) return 'stable';
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = (avg2 - avg1) / avg1;
    if (Math.abs(diff) < 0.05) return 'stable';
    return diff > 0 ? 'improving' : 'worsening';
  };

  const stepValues = recent.filter(d => d.steps).map(d => d.steps!);
  const sleepValues = recent.filter(d => d.sleepHours).map(d => d.sleepHours!);
  const hrValues = recent.filter(d => d.heartRateAvg).map(d => d.heartRateAvg!);

  const trends = [
    { metric: '걸음 수', trend: calcTrend(stepValues), avgValue: Math.round(stepValues.reduce((a, b) => a + b, 0) / stepValues.length), unit: '걸음' },
    { metric: '수면 시간', trend: calcTrend(sleepValues), avgValue: +(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1), unit: '시간' },
    { metric: '평균 심박수', trend: calcTrend(hrValues), avgValue: Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length), unit: 'bpm' },
  ];

  res.json({ trends, period: `${recent[0]?.date} ~ ${recent[recent.length - 1]?.date}`, dataPoints: recent.length });
});
