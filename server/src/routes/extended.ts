import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const extendedRouter = Router();
extendedRouter.use(authenticateToken);

// ============================================================
// 1. 공개 보건 API (병원/약국/의약품 검색)
// ============================================================

/** 병원 검색 */
extendedRouter.get('/hospitals', (req: AuthRequest, res: Response) => {
  const { query, department, lat, lng, radius = '5' } = req.query;
  // 시뮬레이션: 공공데이터포털 건강보험심사평가원 API
  const hospitals = [
    { id: 'h-001', name: '서울대학교병원', department: '내분비내과', address: '서울 종로구 대학로 101', phone: '02-2072-2114', distance: 2.3, rating: 4.5, lat: 37.5796, lng: 126.9992 },
    { id: 'h-002', name: '삼성서울병원', department: '심장내과', address: '서울 강남구 일원로 81', phone: '02-3410-2114', distance: 5.1, rating: 4.7, lat: 37.4881, lng: 127.0855 },
    { id: 'h-003', name: '서울아산병원', department: '소화기내과', address: '서울 송파구 올림픽로43길 88', phone: '02-3010-3114', distance: 6.8, rating: 4.6, lat: 37.5268, lng: 127.1083 },
    { id: 'h-004', name: '강남세브란스병원', department: '내과', address: '서울 강남구 언주로 211', phone: '02-2019-3114', distance: 3.5, rating: 4.4, lat: 37.4966, lng: 127.0398 },
    { id: 'h-005', name: '건국대학교병원', department: '가정의학과', address: '서울 광진구 능동로 120-1', phone: '02-2030-5114', distance: 4.2, rating: 4.3, lat: 37.5408, lng: 127.0707 },
  ].filter(h => !department || h.department.includes(department as string))
   .filter(h => !query || h.name.includes(query as string));

  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'Hospital', details: `병원 검색: ${query || department || '전체'}` });
  res.json({ hospitals, total: hospitals.length });
});

/** 약국 검색 */
extendedRouter.get('/pharmacies', (req: AuthRequest, res: Response) => {
  const pharmacies = [
    { id: 'p-001', name: '온누리약국', address: '서울 강남구 테헤란로 152', phone: '02-555-1234', distance: 0.3, hours: '09:00~22:00', nightService: true },
    { id: 'p-002', name: '건강약국', address: '서울 강남구 역삼로 123', phone: '02-556-5678', distance: 0.5, hours: '08:30~21:00', nightService: false },
    { id: 'p-003', name: '세종약국', address: '서울 강남구 선릉로 234', phone: '02-557-9012', distance: 0.8, hours: '09:00~20:00', nightService: false },
  ];
  res.json({ pharmacies, total: pharmacies.length });
});

/** 의약품 검색 */
extendedRouter.get('/medications/search', (req: AuthRequest, res: Response) => {
  const { query } = req.query;
  const medications = [
    { id: 'm-001', name: '메트포르민정 500mg', ingredient: 'Metformin HCl', manufacturer: '대웅제약', category: '당뇨병용제', shape: '흰색 원형', dosage: '1일 2회, 식후 복용' },
    { id: 'm-002', name: '라미프릴캡슐 5mg', ingredient: 'Ramipril', manufacturer: '한독', category: '혈압강하제', shape: '노란색 캡슐', dosage: '1일 1회, 아침 식후' },
    { id: 'm-003', name: '아토르바스타틴정 20mg', ingredient: 'Atorvastatin', manufacturer: '한미약품', category: '고지혈증치료제', shape: '흰색 타원형', dosage: '1일 1회, 저녁 식후' },
    { id: 'm-004', name: '아스피린장용정 100mg', ingredient: 'Aspirin', manufacturer: '바이엘', category: '항혈전제', shape: '흰색 원형', dosage: '1일 1회' },
    { id: 'm-005', name: '오메프라졸캡슐 20mg', ingredient: 'Omeprazole', manufacturer: '동아에스티', category: '소화성궤양용제', shape: '보라색 캡슐', dosage: '1일 1회, 아침 식전' },
  ].filter(m => !query || m.name.includes(query as string) || m.ingredient.toLowerCase().includes((query as string).toLowerCase()));

  res.json({ medications, total: medications.length });
});

// ============================================================
// 2. 의약품 상호작용 체크
// ============================================================

extendedRouter.post('/medications/interactions', (req: AuthRequest, res: Response) => {
  const { medications } = req.body; // 약물 이름 배열
  // 시뮬레이션: 약물 상호작용 데이터베이스
  const interactions = [
    { drug1: '메트포르민', drug2: '아스피린', severity: 'low', description: '아스피린이 메트포르민의 혈당 강하 효과를 약간 증가시킬 수 있습니다. 저혈당 증상에 주의하세요.' },
    { drug1: '라미프릴', drug2: '아스피린', severity: 'moderate', description: 'NSAIDs/아스피린이 ACE 억제제의 혈압 강하 효과를 감소시킬 수 있습니다. 혈압 모니터링을 권장합니다.' },
    { drug1: '아토르바스타틴', drug2: '오메프라졸', severity: 'low', description: '임상적으로 유의한 상호작용은 보고되지 않았습니다.' },
  ];

  const relevant = medications ? interactions.filter(i =>
    medications.some((m: string) => i.drug1.includes(m) || i.drug2.includes(m))
  ) : interactions;

  res.json({ interactions: relevant, checkedMedications: medications || [], checkedAt: new Date().toISOString() });
});

// ============================================================
// 3. 수동 입력 (일일 기록)
// ============================================================

extendedRouter.post('/daily-records', (req: AuthRequest, res: Response) => {
  const { date, type, value, unit, note } = req.body;
  const record = { id: crypto.randomUUID(), userId: req.userId!, date: date || new Date().toISOString().split('T')[0], type, value, unit, note, createdAt: new Date().toISOString() };

  // 웨어러블 데이터 스토어에 저장
  const data = store.wearableData.get(req.userId!) || [];
  const existing = data.find(d => d.date === record.date);
  if (existing) {
    if (type === 'bloodPressure') { existing.bloodPressureSystolic = value.systolic; existing.bloodPressureDiastolic = value.diastolic; }
    else if (type === 'bloodGlucose') existing.bloodGlucose = value;
    else if (type === 'weight') existing.weight = value;
  } else {
    data.push({ id: record.id, userId: req.userId!, source: 'manual', date: record.date,
      bloodPressureSystolic: type === 'bloodPressure' ? value.systolic : undefined,
      bloodPressureDiastolic: type === 'bloodPressure' ? value.diastolic : undefined,
      bloodGlucose: type === 'bloodGlucose' ? value : undefined,
      weight: type === 'weight' ? value : undefined,
    });
    store.wearableData.set(req.userId!, data);
  }

  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'DailyRecord', details: `일일 기록: ${type}` });
  res.status(201).json(record);
});

extendedRouter.get('/daily-records', (req: AuthRequest, res: Response) => {
  const { startDate, endDate, type } = req.query;
  const data = store.wearableData.get(req.userId!) || [];
  let filtered = data;
  if (startDate) filtered = filtered.filter(d => d.date >= (startDate as string));
  if (endDate) filtered = filtered.filter(d => d.date <= (endDate as string));
  res.json(filtered);
});

// ============================================================
// 4. 복약 체크리스트
// ============================================================

const medicationSchedules = new Map<string, any[]>();

extendedRouter.get('/medication-schedule', (req: AuthRequest, res: Response) => {
  const schedules = medicationSchedules.get(req.userId!) || [
    { id: 'med-sch-1', name: '메트포르민 500mg', times: ['morning', 'evening'], taken: { morning: false, evening: false }, prescribedBy: '서울대학교병원' },
    { id: 'med-sch-2', name: '라미프릴 5mg', times: ['morning'], taken: { morning: false }, prescribedBy: '서울대학교병원' },
    { id: 'med-sch-3', name: '아토르바스타틴 20mg', times: ['evening'], taken: { evening: false }, prescribedBy: '서울대학교병원' },
  ];
  res.json({ date: new Date().toISOString().split('T')[0], schedules });
});

extendedRouter.patch('/medication-schedule/:id/take', (req: AuthRequest, res: Response) => {
  const { time } = req.body; // 'morning' | 'afternoon' | 'evening'
  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'MedicationSchedule', details: `복약 체크: ${req.params.id} (${time})` });
  res.json({ success: true, medicationId: req.params.id, time, takenAt: new Date().toISOString() });
});

extendedRouter.post('/medication-schedule', (req: AuthRequest, res: Response) => {
  const { name, times, prescribedBy } = req.body;
  const schedule = { id: crypto.randomUUID(), name, times, taken: Object.fromEntries(times.map((t: string) => [t, false])), prescribedBy };
  const schedules = medicationSchedules.get(req.userId!) || [];
  schedules.push(schedule);
  medicationSchedules.set(req.userId!, schedules);
  res.status(201).json(schedule);
});

// ============================================================
// 5. 증상 일지
// ============================================================

const symptomLogs = new Map<string, any[]>();

extendedRouter.get('/symptoms', (req: AuthRequest, res: Response) => {
  const logs = symptomLogs.get(req.userId!) || [];
  res.json(logs.slice(-30));
});

extendedRouter.post('/symptoms', (req: AuthRequest, res: Response) => {
  const { date, symptoms, severity, note } = req.body;
  const entry = { id: crypto.randomUUID(), userId: req.userId!, date: date || new Date().toISOString().split('T')[0], symptoms, severity, note, createdAt: new Date().toISOString() };
  const logs = symptomLogs.get(req.userId!) || [];
  logs.push(entry);
  symptomLogs.set(req.userId!, logs);
  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Symptom', details: `증상 기록: ${symptoms.join(', ')}` });
  res.status(201).json(entry);
});

// ============================================================
// 6. 건강 타임라인 (연도별 수치 변화)
// ============================================================

extendedRouter.get('/timeline', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];

  // 연도별 주요 수치 추출
  const timeline = checkups.map(c => ({
    date: c.checkupDate,
    source: c.source,
    metrics: c.observations.reduce((acc: any, obs) => {
      acc[obs.code] = { value: obs.value, unit: obs.unit, status: obs.status };
      return acc;
    }, {}),
  })).sort((a, b) => a.date.localeCompare(b.date));

  // 주요 지표별 트렌드
  const codes = ['BMI', 'BP_SYS', 'BP_DIA', 'FBS', 'HBA1C', 'TC', 'LDL', 'HDL', 'TG'];
  const trends: Record<string, Array<{ date: string; value: number }>> = {};
  for (const code of codes) {
    trends[code] = timeline.filter(t => t.metrics[code]).map(t => ({ date: t.date, value: t.metrics[code].value }));
  }

  res.json({ timeline, trends, totalCheckups: checkups.length });
});

// ============================================================
// 7. 병원 추천 (이상 소견 기반)
// ============================================================

extendedRouter.get('/hospital-recommendations', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const latest = checkups[checkups.length - 1];
  if (!latest) return res.json({ recommendations: [], message: '검진 데이터가 없습니다.' });

  const abnormal = latest.observations.filter(o => o.status !== 'normal');
  const categoryToDepartment: Record<string, string[]> = {
    '당뇨': ['내분비내과', '가정의학과'],
    '혈압': ['심장내과', '내과'],
    '이상지질혈증': ['심장내과', '내과'],
    '간기능': ['소화기내과', '내과'],
    '신장기능': ['신장내과'],
    '비만': ['가정의학과', '비만클리닉'],
  };

  const recommendations = abnormal.map(obs => ({
    category: obs.category,
    item: obs.display,
    value: `${obs.value}${obs.unit}`,
    status: obs.status,
    departments: categoryToDepartment[obs.category] || ['내과'],
    urgency: obs.status === 'critical' ? '즉시 방문' : obs.status === 'warning' ? '2주 이내' : '3개월 이내',
  }));

  res.json({ recommendations, basedOn: latest.checkupDate });
});

// ============================================================
// 8. 알림 / 리마인더
// ============================================================

const reminders = new Map<string, any[]>();

extendedRouter.get('/reminders', (req: AuthRequest, res: Response) => {
  const userReminders = reminders.get(req.userId!) || [
    { id: 'rem-1', type: 'medication', title: '아침 복약 시간', time: '08:00', enabled: true, days: ['mon','tue','wed','thu','fri','sat','sun'] },
    { id: 'rem-2', type: 'medication', title: '저녁 복약 시간', time: '20:00', enabled: true, days: ['mon','tue','wed','thu','fri','sat','sun'] },
    { id: 'rem-3', type: 'mission', title: '주간 미션 확인', time: '09:00', enabled: true, days: ['mon'] },
    { id: 'rem-4', type: 'checkup', title: '정기 건강검진', time: '09:00', enabled: true, nextDate: '2025-06-15' },
    { id: 'rem-5', type: 'record', title: '혈압 측정 리마인더', time: '07:30', enabled: true, days: ['mon','wed','fri'] },
  ];
  res.json(userReminders);
});

extendedRouter.post('/reminders', (req: AuthRequest, res: Response) => {
  const { type, title, time, enabled, days, nextDate } = req.body;
  const reminder = { id: crypto.randomUUID(), type, title, time, enabled: enabled ?? true, days, nextDate };
  const userReminders = reminders.get(req.userId!) || [];
  userReminders.push(reminder);
  reminders.set(req.userId!, userReminders);
  res.status(201).json(reminder);
});

extendedRouter.patch('/reminders/:id', (req: AuthRequest, res: Response) => {
  const userReminders = reminders.get(req.userId!) || [];
  const reminder = userReminders.find(r => r.id === req.params.id);
  if (reminder) Object.assign(reminder, req.body);
  res.json(reminder || { error: 'Not found' });
});

extendedRouter.delete('/reminders/:id', (req: AuthRequest, res: Response) => {
  const userReminders = reminders.get(req.userId!) || [];
  const idx = userReminders.findIndex(r => r.id === req.params.id);
  if (idx >= 0) userReminders.splice(idx, 1);
  reminders.set(req.userId!, userReminders);
  res.json({ success: true });
});

// ============================================================
// 9. 가족/보호자 모드
// ============================================================

const familyConnections = new Map<string, any[]>();

extendedRouter.get('/family', (req: AuthRequest, res: Response) => {
  const connections = familyConnections.get(req.userId!) || [
    { id: 'fam-001', name: '김부모', relationship: 'parent', status: 'active', connectedAt: '2024-01-15', permissions: ['viewDashboard', 'viewCheckup', 'receiveAlerts'] },
  ];
  res.json(connections);
});

extendedRouter.post('/family/invite', (req: AuthRequest, res: Response) => {
  const { name, relationship, email, permissions } = req.body;
  const invitation = { id: crypto.randomUUID(), name, relationship, email, permissions, status: 'pending', invitedAt: new Date().toISOString() };
  const connections = familyConnections.get(req.userId!) || [];
  connections.push(invitation);
  familyConnections.set(req.userId!, connections);
  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Family', details: `보호자 초대: ${name} (${relationship})` });
  res.status(201).json(invitation);
});

extendedRouter.get('/family/:memberId/summary', (req: AuthRequest, res: Response) => {
  // 보호자가 가족 구성원의 요약 정보를 조회
  const summary = {
    name: '김부모',
    lastCheckup: '2024-06-15',
    riskLevel: 'moderate',
    activeGoalProgress: 50,
    recentAlerts: [
      { date: '2024-07-01', message: '혈압 수치가 주의 범위입니다.', severity: 'caution' },
    ],
    medicationAdherence: 85, // 복약 순응도 %
  };
  res.json(summary);
});

// ============================================================
// 10. 만성질환별 관리 프로그램
// ============================================================

extendedRouter.get('/chronic-programs', (req: AuthRequest, res: Response) => {
  const programs = [
    {
      id: 'prog-diabetes', name: '당뇨 전단계 관리', category: 'diabetes',
      description: '공복혈당 100~125mg/dL 또는 HbA1c 5.7~6.4% 대상',
      duration: '90일', modules: ['혈당 모니터링', '식이 관리', '운동 처방', '체중 관리'],
      eligibility: { FBS: { min: 100, max: 125 }, HBA1C: { min: 5.7, max: 6.4 } },
    },
    {
      id: 'prog-hypertension', name: '고혈압 관리', category: 'hypertension',
      description: '수축기 130~159mmHg 또는 이완기 85~99mmHg 대상',
      duration: '90일', modules: ['혈압 모니터링', '나트륨 제한', '유산소 운동', '스트레스 관리'],
      eligibility: { BP_SYS: { min: 130, max: 159 }, BP_DIA: { min: 85, max: 99 } },
    },
    {
      id: 'prog-dyslipidemia', name: '이상지질혈증 관리', category: 'dyslipidemia',
      description: 'LDL 130mg/dL 이상 또는 중성지방 150mg/dL 이상 대상',
      duration: '90일', modules: ['콜레스테롤 모니터링', '식이 관리', '운동 처방', '체중 관리'],
      eligibility: { LDL: { min: 130 }, TG: { min: 150 } },
    },
  ];

  // 사용자 검진 데이터 기반 적합 프로그램 추천
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const latest = checkups[checkups.length - 1];
  const eligible = programs.map(p => {
    let matched = false;
    if (latest) {
      for (const obs of latest.observations) {
        const criteria = (p.eligibility as any)[obs.code];
        if (criteria) {
          if (criteria.min && obs.value >= criteria.min) matched = true;
          if (criteria.max && obs.value <= criteria.max) matched = true;
        }
      }
    }
    return { ...p, recommended: matched };
  });

  res.json({ programs: eligible });
});

extendedRouter.post('/chronic-programs/:programId/enroll', (req: AuthRequest, res: Response) => {
  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'ChronicProgram', details: `프로그램 등록: ${req.params.programId}` });
  res.json({ success: true, enrolledAt: new Date().toISOString(), programId: req.params.programId });
});

// ============================================================
// 11. 데이터 내보내기 (FHIR Bundle / CSV)
// ============================================================

extendedRouter.get('/export/fhir', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const user = store.users.get(req.userId!);

  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      { resource: { resourceType: 'Patient', id: req.userId, name: [{ text: user?.name }], birthDate: user?.birthDate, gender: user?.gender } },
      ...checkups.flatMap(c => c.observations.map(obs => ({
        resource: { resourceType: 'Observation', id: obs.id, code: { text: obs.display }, valueQuantity: { value: obs.value, unit: obs.unit }, effectiveDateTime: c.checkupDate, status: 'final' }
      }))),
    ],
  };

  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'Export', details: 'FHIR Bundle 내보내기' });
  res.setHeader('Content-Disposition', 'attachment; filename=myhealth-export.json');
  res.json(bundle);
});

extendedRouter.get('/export/csv', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];

  let csv = '검진일,항목코드,항목명,측정값,단위,판정,카테고리\n';
  for (const c of checkups) {
    for (const obs of c.observations) {
      csv += `${c.checkupDate},${obs.code},${obs.display},${obs.value},${obs.unit},${obs.status},${obs.category}\n`;
    }
  }

  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'Export', details: 'CSV 내보내기' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=myhealth-export.csv');
  res.send('\uFEFF' + csv); // BOM for Excel
});

// ============================================================
// 12. 병원 추천 (이상 소견 + 위치 기반)
// ============================================================

extendedRouter.get('/nearby-hospitals', (req: AuthRequest, res: Response) => {
  const { category, lat = '37.5665', lng = '126.9780' } = req.query;

  const departmentMap: Record<string, string> = {
    '당뇨': '내분비내과', '혈압': '심장내과', '이상지질혈증': '내과',
    '간기능': '소화기내과', '신장기능': '신장내과', '비만': '가정의학과',
  };
  const dept = departmentMap[category as string] || '내과';

  const hospitals = [
    { name: `${dept} 전문 A의원`, address: '서울 강남구 역삼동 123', distance: 0.5, department: dept, availableToday: true, nextSlot: '14:30' },
    { name: `${dept} 전문 B병원`, address: '서울 강남구 삼성동 456', distance: 1.2, department: dept, availableToday: true, nextSlot: '15:00' },
    { name: `종합 C병원 ${dept}`, address: '서울 서초구 서초동 789', distance: 2.1, department: dept, availableToday: false, nextSlot: '내일 09:30' },
  ];

  res.json({ hospitals, department: dept, category, searchRadius: '3km' });
});
