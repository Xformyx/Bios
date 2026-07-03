// In-memory data store for MVP (production에서는 PostgreSQL + Redis로 교체)
import type { User, ConsentItem, HealthCheckupResult, WearableData, HealthGoal, AICoachMessage, HospitalReport } from './types.js';

// Re-export types from shared
export type { User, ConsentItem, HealthCheckupResult, WearableData, HealthGoal, AICoachMessage, HospitalReport };

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  details?: string;
  ipAddress?: string;
}

class DataStore {
  users: Map<string, User & { passwordHash: string }> = new Map();
  consents: Map<string, ConsentItem[]> = new Map();
  healthCheckups: Map<string, HealthCheckupResult[]> = new Map();
  wearableData: Map<string, WearableData[]> = new Map();
  healthGoals: Map<string, HealthGoal[]> = new Map();
  aiMessages: Map<string, AICoachMessage[]> = new Map();
  reports: Map<string, HospitalReport[]> = new Map();
  auditLogs: AuditLog[] = [];

  // Audit logging
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    this.auditLogs.push({
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }

  getAuditLogs(userId: string): AuditLog[] {
    return this.auditLogs.filter(log => log.userId === userId);
  }
}

export const store = new DataStore();

// 데모 데이터 초기화
export function initDemoData() {
  const demoUserId = 'demo-user-001';
  
  // 데모 사용자
  store.users.set(demoUserId, {
    id: demoUserId,
    email: 'demo@myhealth.kr',
    name: '김건강',
    birthDate: '1985-03-15',
    gender: 'male',
    createdAt: '2024-01-01T00:00:00Z',
    passwordHash: '$2a$10$demo', // 데모용
  });

  // 동의 항목
  store.consents.set(demoUserId, [
    { id: 'consent-1', userId: demoUserId, category: '건강검진', purpose: '검진 결과 분석 및 건강 코칭', status: 'active', grantedAt: '2024-01-01T00:00:00Z', expiresAt: '2025-01-01T00:00:00Z' },
    { id: 'consent-2', userId: demoUserId, category: '웨어러블', purpose: '활동량 분석 및 건강 목표 관리', status: 'active', grantedAt: '2024-01-01T00:00:00Z', expiresAt: '2025-01-01T00:00:00Z' },
    { id: 'consent-3', userId: demoUserId, category: '생활습관', purpose: '개인 맞춤 건강 행동 계획 생성', status: 'active', grantedAt: '2024-01-01T00:00:00Z', expiresAt: '2025-01-01T00:00:00Z' },
  ]);

  // 건강검진 결과
  store.healthCheckups.set(demoUserId, [{
    id: 'checkup-001',
    userId: demoUserId,
    checkupDate: '2024-06-15',
    source: 'upload',
    createdAt: '2024-06-20T00:00:00Z',
    observations: [
      { id: 'obs-1', code: 'BMI', display: '체질량지수(BMI)', value: 26.8, unit: 'kg/m²', status: 'caution', referenceRange: { low: 18.5, high: 24.9 }, category: '비만' },
      { id: 'obs-2', code: 'BP_SYS', display: '수축기 혈압', value: 138, unit: 'mmHg', status: 'caution', referenceRange: { low: 90, high: 130 }, category: '혈압' },
      { id: 'obs-3', code: 'BP_DIA', display: '이완기 혈압', value: 88, unit: 'mmHg', status: 'caution', referenceRange: { low: 60, high: 85 }, category: '혈압' },
      { id: 'obs-4', code: 'FBS', display: '공복혈당', value: 112, unit: 'mg/dL', status: 'caution', referenceRange: { low: 70, high: 99 }, category: '당뇨' },
      { id: 'obs-5', code: 'HBA1C', display: '당화혈색소(HbA1c)', value: 5.9, unit: '%', status: 'caution', referenceRange: { low: 4.0, high: 5.6 }, category: '당뇨' },
      { id: 'obs-6', code: 'TC', display: '총콜레스테롤', value: 228, unit: 'mg/dL', status: 'caution', referenceRange: { low: 0, high: 200 }, category: '이상지질혈증' },
      { id: 'obs-7', code: 'LDL', display: 'LDL 콜레스테롤', value: 148, unit: 'mg/dL', status: 'warning', referenceRange: { low: 0, high: 130 }, category: '이상지질혈증' },
      { id: 'obs-8', code: 'HDL', display: 'HDL 콜레스테롤', value: 42, unit: 'mg/dL', status: 'caution', referenceRange: { low: 60, high: 100 }, category: '이상지질혈증' },
      { id: 'obs-9', code: 'TG', display: '중성지방', value: 185, unit: 'mg/dL', status: 'caution', referenceRange: { low: 0, high: 150 }, category: '이상지질혈증' },
      { id: 'obs-10', code: 'AST', display: 'AST(SGOT)', value: 32, unit: 'U/L', status: 'normal', referenceRange: { low: 0, high: 40 }, category: '간기능' },
      { id: 'obs-11', code: 'ALT', display: 'ALT(SGPT)', value: 45, unit: 'U/L', status: 'caution', referenceRange: { low: 0, high: 35 }, category: '간기능' },
      { id: 'obs-12', code: 'GGT', display: 'γ-GTP', value: 68, unit: 'U/L', status: 'caution', referenceRange: { low: 0, high: 63 }, category: '간기능' },
      { id: 'obs-13', code: 'CREATININE', display: '크레아티닌', value: 0.9, unit: 'mg/dL', status: 'normal', referenceRange: { low: 0.5, high: 1.2 }, category: '신장기능' },
      { id: 'obs-14', code: 'EGFR', display: '사구체여과율(eGFR)', value: 92, unit: 'mL/min', status: 'normal', referenceRange: { low: 90, high: 120 }, category: '신장기능' },
    ],
  }]);

  // 웨어러블 데이터 (최근 7일)
  const wearableEntries: WearableData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    wearableEntries.push({
      id: `wearable-${i}`,
      userId: demoUserId,
      source: 'apple_health',
      date: date.toISOString().split('T')[0],
      steps: 5000 + Math.floor(Math.random() * 8000),
      sleepHours: 5.5 + Math.random() * 2.5,
      heartRateAvg: 68 + Math.floor(Math.random() * 12),
      heartRateMin: 55 + Math.floor(Math.random() * 8),
      heartRateMax: 110 + Math.floor(Math.random() * 40),
      activeMinutes: 20 + Math.floor(Math.random() * 40),
      caloriesBurned: 1800 + Math.floor(Math.random() * 600),
      weight: 78 + Math.random() * 2 - 1,
    });
  }
  store.wearableData.set(demoUserId, wearableEntries);

  // 90일 건강 목표
  store.healthGoals.set(demoUserId, [{
    id: 'goal-001',
    userId: demoUserId,
    title: '대사건강 개선 90일 프로그램',
    description: '혈압, 혈당, 콜레스테롤 수치 개선을 위한 생활습관 변화 프로그램',
    startDate: '2024-07-01',
    endDate: '2024-09-28',
    status: 'active',
    weeklyMissions: [
      { id: 'mission-1', week: 1, title: '매일 30분 걷기', description: '점심시간 또는 퇴근 후 30분 이상 걷기', completed: true, completedAt: '2024-07-07' },
      { id: 'mission-2', week: 2, title: '나트륨 섭취 줄이기', description: '국물 반만 먹기, 소금 대신 레몬즙 활용', completed: true, completedAt: '2024-07-14' },
      { id: 'mission-3', week: 3, title: '수면 7시간 확보', description: '취침 1시간 전 스마트폰 사용 중단', completed: false },
      { id: 'mission-4', week: 4, title: '주 3회 유산소 운동', description: '빠르게 걷기, 자전거, 수영 중 택 1', completed: false },
    ],
  }]);
}

// 서버 시작 시 데모 데이터 초기화
initDemoData();
