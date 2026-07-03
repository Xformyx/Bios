import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const reportRouter = Router();
reportRouter.use(authenticateToken);

// 리포트 목록 조회
reportRouter.get('/', (req: AuthRequest, res: Response) => {
  const reports = store.reports.get(req.userId!) || [];
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'Report', details: '리포트 목록 조회' });
  res.json(reports);
});

// 병원 제출용 리포트 생성
reportRouter.post('/generate', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const wearable = store.wearableData.get(req.userId!) || [];
  const goals = store.healthGoals.get(req.userId!) || [];
  const user = store.users.get(req.userId!);

  if (!user) {
    return res.status(404).json({ error: '사용자 정보를 찾을 수 없습니다.' });
  }

  const latestCheckup = checkups[checkups.length - 1];
  if (!latestCheckup) {
    return res.status(400).json({ error: '검진 데이터가 없습니다. 먼저 검진 결과를 업로드해주세요.' });
  }

  const recentWearable = wearable.slice(-30);
  const activeGoal = goals.find(g => g.status === 'active');

  // 리포트 생성
  const report = {
    id: crypto.randomUUID(),
    userId: req.userId!,
    title: `건강 상담 리포트 - ${new Date().toLocaleDateString('ko-KR')}`,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: '환자 기본 정보',
        content: `이름: ${user.name}\n생년월일: ${user.birthDate || '미입력'}\n성별: ${user.gender === 'male' ? '남성' : user.gender === 'female' ? '여성' : '미입력'}\n검진일: ${latestCheckup.checkupDate}`,
      },
      {
        title: '주요 검사 결과 요약',
        content: '아래는 최근 건강검진에서 정상 범위를 벗어난 항목입니다.',
        observations: latestCheckup.observations.filter(o => o.status !== 'normal'),
      },
      {
        title: '전체 검사 결과',
        content: '전체 검사 항목과 참조 범위입니다.',
        observations: latestCheckup.observations,
      },
      {
        title: '최근 생활 활동 데이터',
        content: recentWearable.length > 0
          ? `최근 ${recentWearable.length}일간 평균:\n- 걸음 수: ${Math.round(recentWearable.reduce((a, w) => a + (w.steps || 0), 0) / recentWearable.length)}걸음/일\n- 수면: ${(recentWearable.reduce((a, w) => a + (w.sleepHours || 0), 0) / recentWearable.length).toFixed(1)}시간/일\n- 활동 시간: ${Math.round(recentWearable.reduce((a, w) => a + (w.activeMinutes || 0), 0) / recentWearable.length)}분/일`
          : '웨어러블 데이터가 없습니다.',
        trends: recentWearable.length > 0 ? [
          { label: '걸음 수', data: recentWearable.map(w => ({ date: w.date, value: w.steps || 0 })), unit: '걸음', trend: 'stable' as const },
          { label: '수면 시간', data: recentWearable.map(w => ({ date: w.date, value: w.sleepHours || 0 })), unit: '시간', trend: 'stable' as const },
        ] : undefined,
      },
      {
        title: '건강 관리 목표 진행 상황',
        content: activeGoal
          ? `목표: ${activeGoal.title}\n기간: ${activeGoal.startDate} ~ ${activeGoal.endDate}\n진행률: ${activeGoal.weeklyMissions.filter(m => m.completed).length}/${activeGoal.weeklyMissions.length} 미션 완료\n\n완료 미션:\n${activeGoal.weeklyMissions.filter(m => m.completed).map(m => `✓ ${m.title}`).join('\n')}\n\n진행 중:\n${activeGoal.weeklyMissions.filter(m => !m.completed).map(m => `○ ${m.title}`).join('\n')}`
          : '설정된 건강 목표가 없습니다.',
      },
      {
        title: '상담 요청 사항',
        content: '※ 이 리포트는 MyHealth Market Lite 플랫폼에서 자동 생성되었습니다.\n※ 의료적 판단이나 진단을 포함하지 않습니다.\n※ 환자의 자가 기록 데이터를 기반으로 작성되었으며, 의료진의 전문적 판단을 위한 참고 자료입니다.',
      },
    ],
  };

  const reports = store.reports.get(req.userId!) || [];
  reports.push(report);
  store.reports.set(req.userId!, reports);

  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Report', resourceId: report.id, details: '병원 제출용 리포트 생성' });
  res.status(201).json(report);
});

// 특정 리포트 조회
reportRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const reports = store.reports.get(req.userId!) || [];
  const report = reports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: '리포트를 찾을 수 없습니다.' });
  }
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'Report', resourceId: report.id, details: '리포트 상세 조회' });
  res.json(report);
});
