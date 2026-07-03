import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const healthDataRouter = Router();
healthDataRouter.use(authenticateToken);

// 건강검진 결과 목록 조회
healthDataRouter.get('/checkups', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'HealthCheckup', details: '검진 결과 목록 조회' });
  res.json(checkups);
});

// 특정 검진 결과 조회
healthDataRouter.get('/checkups/:id', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const checkup = checkups.find(c => c.id === req.params.id);
  if (!checkup) {
    return res.status(404).json({ error: '검진 결과를 찾을 수 없습니다.' });
  }
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'HealthCheckup', resourceId: checkup.id, details: '검진 결과 상세 조회' });
  res.json(checkup);
});

// 수동 검사 수치 입력
healthDataRouter.post('/observations', (req: AuthRequest, res: Response) => {
  const { code, display, value, unit, category } = req.body;

  // 참조 범위 자동 설정
  const referenceRanges: Record<string, { low: number; high: number }> = {
    'BP_SYS': { low: 90, high: 130 },
    'BP_DIA': { low: 60, high: 85 },
    'FBS': { low: 70, high: 99 },
    'HBA1C': { low: 4.0, high: 5.6 },
    'TC': { low: 0, high: 200 },
    'LDL': { low: 0, high: 130 },
    'HDL': { low: 60, high: 100 },
    'TG': { low: 0, high: 150 },
    'WEIGHT': { low: 40, high: 100 },
    'BLOOD_GLUCOSE': { low: 70, high: 140 },
  };

  const range = referenceRanges[code];
  let status: 'normal' | 'caution' | 'warning' | 'critical' = 'normal';
  if (range) {
    if (value > range.high * 1.5 || value < range.low * 0.5) status = 'critical';
    else if (value > range.high * 1.2 || value < range.low * 0.7) status = 'warning';
    else if (value > range.high || value < range.low) status = 'caution';
  }

  const observation = {
    id: crypto.randomUUID(),
    code,
    display,
    value,
    unit,
    status,
    referenceRange: range,
    category: category || '기타',
  };

  // 최신 검진에 추가하거나 새 검진 생성
  let checkups = store.healthCheckups.get(req.userId!) || [];
  if (checkups.length === 0) {
    checkups = [{
      id: crypto.randomUUID(),
      userId: req.userId!,
      checkupDate: new Date().toISOString().split('T')[0],
      source: 'manual',
      observations: [],
      createdAt: new Date().toISOString(),
    }];
    store.healthCheckups.set(req.userId!, checkups);
  }
  checkups[checkups.length - 1].observations.push(observation);

  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Observation', resourceId: observation.id, details: `수동 입력: ${display}` });
  res.status(201).json(observation);
});

// 건강 요약 대시보드 데이터
healthDataRouter.get('/summary', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const wearable = store.wearableData.get(req.userId!) || [];
  const goals = store.healthGoals.get(req.userId!) || [];

  const latestCheckup = checkups[checkups.length - 1];
  const latestWearable = wearable[wearable.length - 1];
  const activeGoal = goals.find(g => g.status === 'active');

  // 위험 신호 분석
  const riskSignals: Array<{ level: string; message: string; category: string }> = [];
  if (latestCheckup) {
    for (const obs of latestCheckup.observations) {
      if (obs.status === 'critical') {
        riskSignals.push({ level: 'critical', message: `${obs.display}: ${obs.value}${obs.unit} - 즉시 의료진 상담이 필요합니다.`, category: obs.category });
      } else if (obs.status === 'warning') {
        riskSignals.push({ level: 'warning', message: `${obs.display}: ${obs.value}${obs.unit} - 주의가 필요합니다.`, category: obs.category });
      } else if (obs.status === 'caution') {
        riskSignals.push({ level: 'caution', message: `${obs.display}: ${obs.value}${obs.unit} - 관리가 필요합니다.`, category: obs.category });
      }
    }
  }

  // 카테고리별 요약
  const categoryScores: Record<string, { total: number; abnormal: number; status: string }> = {};
  if (latestCheckup) {
    for (const obs of latestCheckup.observations) {
      if (!categoryScores[obs.category]) {
        categoryScores[obs.category] = { total: 0, abnormal: 0, status: 'normal' };
      }
      categoryScores[obs.category].total++;
      if (obs.status !== 'normal') {
        categoryScores[obs.category].abnormal++;
        if (obs.status === 'critical' || obs.status === 'warning') {
          categoryScores[obs.category].status = 'warning';
        } else if (categoryScores[obs.category].status !== 'warning') {
          categoryScores[obs.category].status = 'caution';
        }
      }
    }
  }

  // 주간 활동 요약
  const weeklyActivity = wearable.slice(-7).map(w => ({
    date: w.date,
    steps: w.steps || 0,
    sleepHours: w.sleepHours || 0,
    activeMinutes: w.activeMinutes || 0,
  }));

  const summary = {
    lastCheckupDate: latestCheckup?.checkupDate,
    totalObservations: latestCheckup?.observations.length || 0,
    riskSignals,
    categoryScores,
    weeklyActivity,
    activeGoal: activeGoal ? {
      title: activeGoal.title,
      progress: activeGoal.weeklyMissions.filter(m => m.completed).length / activeGoal.weeklyMissions.length * 100,
      currentWeek: activeGoal.weeklyMissions.findIndex(m => !m.completed) + 1,
    } : null,
    latestMetrics: latestWearable ? {
      steps: latestWearable.steps,
      sleepHours: latestWearable.sleepHours,
      heartRateAvg: latestWearable.heartRateAvg,
      weight: latestWearable.weight,
    } : null,
  };

  res.json(summary);
});

// 건강 목표 조회
healthDataRouter.get('/goals', (req: AuthRequest, res: Response) => {
  const goals = store.healthGoals.get(req.userId!) || [];
  res.json(goals);
});

// 미션 완료 처리
healthDataRouter.patch('/goals/:goalId/missions/:missionId/complete', (req: AuthRequest, res: Response) => {
  const goals = store.healthGoals.get(req.userId!) || [];
  const goal = goals.find(g => g.id === req.params.goalId);
  if (!goal) return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });

  const mission = goal.weeklyMissions.find(m => m.id === req.params.missionId);
  if (!mission) return res.status(404).json({ error: '미션을 찾을 수 없습니다.' });

  mission.completed = true;
  mission.completedAt = new Date().toISOString();

  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'Mission', resourceId: mission.id, details: `미션 완료: ${mission.title}` });
  res.json(goal);
});
