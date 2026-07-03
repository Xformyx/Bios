import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { llmProvider } from '../services/llmProvider.js';

export const aiCoachRouter = Router();
aiCoachRouter.use(authenticateToken);



const SYSTEM_PROMPT = `당신은 "MyHealth 건강 코치"입니다. 사용자의 건강 데이터를 쉽게 설명하고, 생활습관 개선을 돕고, 진료 준비를 지원하는 보조 도구입니다.

## 허용 기능
- 검진 수치의 일반적 의미 설명
- 최근 변화 추세 요약
- 건강 행동 목표 제안 (식이, 운동, 수면, 복약 습관)
- 다음 진료 때 물어볼 질문 생성
- 응급 신호 또는 병원 방문 권고 문구 표시

## 절대 금지
- 특정 질병 확정 진단
- 약물 중단 또는 용량 변경 지시
- 치료법 결정
- 검사 필요/불필요 단정
- 의료진 상담을 대체하는 표현

## 응답 원칙
- 항상 "이 정보는 참고용이며, 정확한 진단과 치료는 의료진과 상담하세요"라는 안내를 포함합니다.
- 근거 데이터와 데이터 한계를 함께 표시합니다.
- 고위험 증상 키워드(흉통, 호흡곤란, 의식저하, 편마비 등)는 즉시 병원/응급 안내로 전환합니다.
- 한국어로 친근하고 이해하기 쉽게 답변합니다.
- 답변은 구조화하여 제공합니다 (요약 → 설명 → 행동 제안 → 참고사항).`;

// 대화 기록 조회
aiCoachRouter.get('/messages', (req: AuthRequest, res: Response) => {
  const messages = store.aiMessages.get(req.userId!) || [];
  res.json(messages.slice(-50)); // 최근 50개
});

// AI 코치에게 메시지 전송
aiCoachRouter.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: '메시지를 입력해주세요.' });
    }

    // 사용자 메시지 저장
    const userMessage = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString(),
    };

    const messages = store.aiMessages.get(req.userId!) || [];
    messages.push(userMessage);

    // 사용자 건강 데이터 컨텍스트 구성
    const checkups = store.healthCheckups.get(req.userId!) || [];
    const wearable = store.wearableData.get(req.userId!) || [];
    const goals = store.healthGoals.get(req.userId!) || [];

    const latestCheckup = checkups[checkups.length - 1];
    const recentWearable = wearable.slice(-7);

    let contextMessage = '## 사용자 건강 데이터 컨텍스트\n\n';
    if (latestCheckup) {
      contextMessage += `### 최근 검진 (${latestCheckup.checkupDate})\n`;
      for (const obs of latestCheckup.observations) {
        const rangeText = obs.referenceRange ? `(참조범위: ${obs.referenceRange.low || '-'}~${obs.referenceRange.high || '-'})` : '';
        contextMessage += `- ${obs.display}: ${obs.value}${obs.unit} [${obs.status}] ${rangeText}\n`;
      }
    }

    if (recentWearable.length > 0) {
      contextMessage += `\n### 최근 7일 활동 데이터\n`;
      const avgSteps = Math.round(recentWearable.filter(w => w.steps).reduce((a, w) => a + (w.steps || 0), 0) / recentWearable.length);
      const avgSleep = (recentWearable.filter(w => w.sleepHours).reduce((a, w) => a + (w.sleepHours || 0), 0) / recentWearable.length).toFixed(1);
      contextMessage += `- 평균 걸음 수: ${avgSteps}걸음/일\n`;
      contextMessage += `- 평균 수면: ${avgSleep}시간/일\n`;
    }

    if (goals.length > 0) {
      const activeGoal = goals.find(g => g.status === 'active');
      if (activeGoal) {
        const completed = activeGoal.weeklyMissions.filter(m => m.completed).length;
        contextMessage += `\n### 현재 목표: ${activeGoal.title}\n`;
        contextMessage += `- 진행률: ${completed}/${activeGoal.weeklyMissions.length} 미션 완료\n`;
      }
    }

    // LLM 호출
    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
    ];

    // 최근 대화 맥락 추가 (최근 6개)
    const recentMessages = messages.slice(-6);
    for (const msg of recentMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const assistantContent = await llmProvider.chatCompletion(chatMessages) || '죄송합니다. 응답을 생성하지 못했습니다. 다시 시도해주세요.';

    // 응답 메타데이터 분류
    let messageType: 'explanation' | 'action_plan' | 'question_suggestion' | 'warning' = 'explanation';
    if (assistantContent.includes('병원') && assistantContent.includes('방문')) messageType = 'warning';
    else if (assistantContent.includes('목표') || assistantContent.includes('계획') || assistantContent.includes('실천')) messageType = 'action_plan';
    else if (assistantContent.includes('질문') || assistantContent.includes('물어')) messageType = 'question_suggestion';

    const assistantMessage = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      role: 'assistant' as const,
      content: assistantContent,
      timestamp: new Date().toISOString(),
      metadata: {
        type: messageType,
        limitations: ['이 정보는 참고용이며, 정확한 진단과 치료는 의료진과 상담하세요.'],
      },
    };

    messages.push(assistantMessage);
    store.aiMessages.set(req.userId!, messages);

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'AICoachChat', details: 'AI 코치 대화' });
    res.json(assistantMessage);
  } catch (error: any) {
    console.error('AI Coach error:', error.message);
    // LLM 호출 실패 시 기본 응답
    const fallbackMessage = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      role: 'assistant' as const,
      content: '죄송합니다. 현재 AI 코치 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.\n\n그동안 다음을 확인해보세요:\n- 대시보드에서 최근 검진 결과 확인\n- 주간 미션 진행 상황 체크\n- 웨어러블 데이터 트렌드 확인',
      timestamp: new Date().toISOString(),
      metadata: { type: 'explanation' as const },
    };
    const messages = store.aiMessages.get(req.userId!) || [];
    messages.push(fallbackMessage);
    store.aiMessages.set(req.userId!, messages);
    res.json(fallbackMessage);
  }
});

// 병원 질문 리스트 자동 생성
aiCoachRouter.get('/hospital-questions', async (req: AuthRequest, res: Response) => {
  try {
    const checkups = store.healthCheckups.get(req.userId!) || [];
    const latestCheckup = checkups[checkups.length - 1];

    if (!latestCheckup) {
      return res.json({ questions: ['아직 검진 데이터가 없습니다. 검진 결과를 업로드하면 맞춤 질문을 생성해드립니다.'] });
    }

    const abnormalObs = latestCheckup.observations.filter(o => o.status !== 'normal');
    const obsContext = abnormalObs.map(o => `${o.display}: ${o.value}${o.unit} (상태: ${o.status})`).join('\n');

    const content = await llmProvider.chatCompletion([
      { role: 'system', content: '당신은 환자가 의사에게 물어볼 질문을 생성하는 도우미입니다. 검진 결과에서 이상 소견이 있는 항목을 바탕으로, 환자가 진료 시 의사에게 물어보면 좋을 구체적인 질문 5~7개를 생성하세요. 한국어로 작성하세요.' },
      { role: 'user', content: `다음은 제 검진 결과 중 이상 소견 항목입니다:\n${obsContext}\n\n이 결과를 바탕으로 다음 진료 때 의사에게 물어볼 질문을 생성해주세요.` },
    ]) || '';
    const questions = content.split('\n').filter(line => line.trim().length > 0 && (line.includes('?') || line.match(/^\d+\./)));

    res.json({ questions, generatedAt: new Date().toISOString(), basedOn: latestCheckup.checkupDate });
  } catch (error) {
    // 폴백 질문
    res.json({
      questions: [
        '현재 수치를 볼 때 약물 치료가 필요한 단계인가요?',
        '생활습관 개선만으로 수치 개선이 가능한가요?',
        '다음 검사는 언제 받는 것이 좋을까요?',
        '현재 복용 중인 영양제가 검사 수치에 영향을 줄 수 있나요?',
        '운동 강도나 종류에 제한이 있나요?',
      ],
      generatedAt: new Date().toISOString(),
      basedOn: 'fallback',
    });
  }
});
