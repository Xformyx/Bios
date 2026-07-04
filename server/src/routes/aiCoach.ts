import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { healthCoachGraph } from '../services/langGraph.js';
import { evidenceDB } from '../services/evidenceDB.js';

export const aiCoachRouter = Router();
aiCoachRouter.use(authenticateToken);

const SYSTEM_PROMPT = `당신은 "MyHealth 건강 코치"입니다. 근거 기반 의학(EBM) 원칙에 따라 사용자의 건강 데이터를 쉽게 설명하고, 생활습관 개선을 돕고, 진료 준비를 지원합니다.

## 허용 기능
- 검진 수치의 일반적 의미 설명 (근거 논문 인용)
- 최근 변화 추세 요약
- 건강 행동 목표 제안 (식이, 운동, 수면, 복약 습관)
- 다음 진료 때 물어볼 질문 생성
- 응급 신호 또는 병원 방문 권고 문구 표시

## 절대 금지
- 특정 질병 확정 진단
- 약물 중단 또는 용량 변경 지시
- 치료법 결정
- 의료진 상담을 대체하는 표현

## 응답 원칙
- 근거 논문 [출처 번호]를 반드시 표시
- 근거에 없는 내용은 "추가 연구 필요" 명시
- 한국어로 친근하고 이해하기 쉽게 답변
- 답변 구조: 요약 → 근거 설명 → 행동 제안 → 참고사항`;

// 대화 기록 조회
aiCoachRouter.get('/messages', (req: AuthRequest, res: Response) => {
  const messages = store.aiMessages.get(req.userId!) || [];
  res.json(messages.slice(-50));
});

// AI 코치에게 메시지 전송 (LangGraph 파이프라인)
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

    // LangGraph 파이프라인 실행
    const conversationHistory = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const graphResult = await healthCoachGraph.invoke(req.userId!, message, conversationHistory);

    // 응답 메시지 생성
    const assistantMessage = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      role: 'assistant' as const,
      content: graphResult.response,
      timestamp: new Date().toISOString(),
      metadata: {
        type: graphResult.safetyFlags.includes('EMERGENCY_DETECTED') ? 'warning' as const : 'explanation' as const,
        references: graphResult.citations.map(c => `[${c.index}] ${c.title} (${c.year})`),
        limitations: ['이 정보는 근거 논문을 바탕으로 한 참고용이며, 정확한 진단과 치료는 의료진과 상담하세요.'],
        citations: graphResult.citations,
        evidenceCount: graphResult.evidencePapers.length,
        executionLog: graphResult.executionLog,
        safetyFlags: graphResult.safetyFlags,
      },
    };

    messages.push(assistantMessage);
    store.aiMessages.set(req.userId!, messages);

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'AICoachChat', details: `LangGraph 파이프라인 (${graphResult.evidencePapers.length}개 근거)` });
    res.json(assistantMessage);
  } catch (error: any) {
    console.error('AI Coach error:', error.message);
    const fallbackMessage = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      role: 'assistant' as const,
      content: '죄송합니다. 현재 AI 코치 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.\n\n그동안 다음을 확인해보세요:\n- 대시보드에서 최근 검진 결과 확인\n- 주간 미션 진행 상황 체크\n- 웨어러블 데이터 트렌드 확인',
      timestamp: new Date().toISOString(),
      metadata: { type: 'explanation' as const, error: error.message },
    };
    const messages = store.aiMessages.get(req.userId!) || [];
    messages.push(fallbackMessage);
    store.aiMessages.set(req.userId!, messages);
    res.json(fallbackMessage);
  }
});

// 병원 질문 리스트 자동 생성 (LangGraph 사용)
aiCoachRouter.get('/hospital-questions', async (req: AuthRequest, res: Response) => {
  try {
    const checkups = store.healthCheckups.get(req.userId!) || [];
    const latestCheckup = checkups[checkups.length - 1];

    if (!latestCheckup) {
      return res.json({ questions: ['아직 검진 데이터가 없습니다. 검진 결과를 업로드하면 맞춤 질문을 생성해드립니다.'] });
    }

    const graphResult = await healthCoachGraph.invoke(
      req.userId!,
      '내 검진 결과를 바탕으로 다음 진료 때 의사에게 물어볼 구체적인 질문 5~7개를 생성해주세요.',
    );

    const questions = graphResult.response.split('\n').filter(line => line.trim().length > 5 && (line.includes('?') || line.match(/^\d+[\.\)]/)));

    res.json({
      questions: questions.length > 0 ? questions : [
        '현재 수치를 볼 때 약물 치료가 필요한 단계인가요?',
        '생활습관 개선만으로 수치 개선이 가능한가요?',
        '다음 검사는 언제 받는 것이 좋을까요?',
        '현재 복용 중인 영양제가 검사 수치에 영향을 줄 수 있나요?',
        '운동 강도나 종류에 제한이 있나요?',
      ],
      generatedAt: new Date().toISOString(),
      basedOn: latestCheckup.checkupDate,
      evidenceCount: graphResult.evidencePapers.length,
    });
  } catch (error) {
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

// AI 리포트 생성 (LangGraph 전체 분석)
aiCoachRouter.post('/report', async (req: AuthRequest, res: Response) => {
  try {
    const graphResult = await healthCoachGraph.generateReport(req.userId!);

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'AIReport', details: `AI 리포트 생성 (${graphResult.evidencePapers.length}개 근거)` });

    res.json({
      report: graphResult.response,
      citations: graphResult.citations,
      evidencePapers: graphResult.evidencePapers.map(p => ({
        title: p.title,
        authors: p.authors,
        journal: p.journal,
        year: p.year,
        evidenceLevel: p.evidenceLevel,
        combinedScore: p.combinedScore,
        keyFindings: p.keyFindings,
      })),
      analysis: graphResult.analysisResult,
      executionLog: graphResult.executionLog,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 근거 논문 DB 조회
aiCoachRouter.get('/evidence', (req: AuthRequest, res: Response) => {
  const { codes, category, keyword } = req.query;

  let papers;
  if (codes) {
    papers = evidenceDB.searchByCode((codes as string).split(','));
  } else if (category) {
    papers = evidenceDB.searchByCategory(category as string);
  } else if (keyword) {
    papers = evidenceDB.searchByKeyword(keyword as string);
  } else {
    papers = evidenceDB.getAllPapers();
  }

  res.json({ papers, total: papers.length, dbTotal: evidenceDB.getTotalCount() });
});

// LangGraph 파이프라인 상태 조회
aiCoachRouter.get('/pipeline-info', (req: AuthRequest, res: Response) => {
  res.json({
    pipeline: 'LangGraph Multi-Step Reasoning',
    nodes: [
      { name: 'DataCollector', description: '사용자 건강 데이터 수집 (검진, 웨어러블, DTC, 목표)' },
      { name: 'EvidenceRetriever', description: '관련 근거 논문 RAG 검색 (최대 5개, 스코어 기반)' },
      { name: 'Analyzer', description: '데이터 + 근거 교차 분석 (위험 평가, 인사이트 도출)' },
      { name: 'ResponseGenerator', description: 'LLM 기반 근거 인용 응답 생성' },
      { name: 'SafetyChecker', description: '의료 안전장치 검증 (응급, 금지 표현, 면책)' },
    ],
    evidenceDB: {
      totalPapers: evidenceDB.getTotalCount(),
      categories: ['혈당', '혈압', '이상지질혈증', '수면', '활동량', '영양소'],
      scoringMethod: 'relevance(0.6) * accuracy(0.4)',
      maxPerQuery: 5,
    },
  });
});
