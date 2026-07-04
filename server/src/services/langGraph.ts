/**
 * LangGraph 기반 멀티스텝 추론 파이프라인
 * 
 * 구조:
 * 1. DataCollector: 사용자의 모든 건강 데이터 수집 (검진, 웨어러블, DTC, 일일기록)
 * 2. EvidenceRetriever: 관련 근거 논문 검색 (RAG)
 * 3. Analyzer: 데이터 + 근거 기반 분석
 * 4. ResponseGenerator: 최종 응답 생성
 * 5. SafetyChecker: 의료 안전장치 검증
 * 
 * 각 노드는 상태(State)를 공유하며 순차적으로 실행됩니다.
 */

import { store } from '../utils/store.js';
import { evidenceDB, EvidencePaper } from './evidenceDB.js';
import { dtcGenomicService } from './dtcGenomic.js';
import { llmProvider } from './llmProvider.js';

// ============================================================
// State 정의
// ============================================================

export interface GraphState {
  // 입력
  userId: string;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;

  // 데이터 수집 결과
  healthData: {
    checkupObservations: any[];
    wearableRecent: any[];
    genomicHighRisk: any[];
    activeGoals: any[];
    lastCheckupDate?: string;
  } | null;

  // RAG 결과
  evidencePapers: EvidencePaper[];
  ragContext: string;

  // 분석 결과
  analysisResult: {
    relevantFindings: string[];
    riskAssessment: string;
    actionableInsights: string[];
  } | null;

  // 최종 응답
  response: string;
  citations: Array<{ index: number; title: string; year: number; finding: string }>;
  safetyFlags: string[];

  // 메타데이터
  executionLog: Array<{ node: string; timestamp: string; duration: number; status: string }>;
}

// ============================================================
// Graph Nodes
// ============================================================

type NodeFunction = (state: GraphState) => Promise<GraphState>;

/**
 * Node 1: DataCollector
 * 사용자의 모든 건강 데이터를 수집합니다.
 */
async function dataCollectorNode(state: GraphState): Promise<GraphState> {
  const start = Date.now();

  const checkups = store.healthCheckups.get(state.userId) || [];
  const wearable = store.wearableData.get(state.userId) || [];
  const goals = store.healthGoals.get(state.userId) || [];
  const genomicReport = dtcGenomicService.getReport(state.userId);

  const latestCheckup = checkups[checkups.length - 1];
  const recentWearable = wearable.slice(-7);

  state.healthData = {
    checkupObservations: latestCheckup?.observations || [],
    wearableRecent: recentWearable,
    genomicHighRisk: genomicReport
      ? genomicReport.categories.flatMap(c => c.items).filter(i => i.riskLevel === 'high')
      : [],
    activeGoals: goals.filter(g => g.status === 'active'),
    lastCheckupDate: latestCheckup?.checkupDate,
  };

  state.executionLog.push({ node: 'DataCollector', timestamp: new Date().toISOString(), duration: Date.now() - start, status: 'success' });
  return state;
}

/**
 * Node 2: EvidenceRetriever (RAG)
 * 사용자 데이터와 질문에 관련된 근거 논문을 검색합니다.
 */
async function evidenceRetrieverNode(state: GraphState): Promise<GraphState> {
  const start = Date.now();

  // 검진 코드 추출
  const checkupCodes = state.healthData?.checkupObservations
    .filter(o => o.status !== 'normal')
    .map(o => o.code) || [];

  // DTC 코드 추출
  const dtcCodes = state.healthData?.genomicHighRisk.map((g: any) => g.code) || [];

  // 라이프로그 키워드 추출 (질문에서)
  const lifelogKeywords: string[] = [];
  const msg = state.userMessage.toLowerCase();
  if (msg.includes('수면') || msg.includes('잠')) lifelogKeywords.push('수면');
  if (msg.includes('걸음') || msg.includes('운동') || msg.includes('활동')) lifelogKeywords.push('활동량');
  if (msg.includes('혈당') || msg.includes('당뇨')) lifelogKeywords.push('혈당');
  if (msg.includes('혈압') || msg.includes('고혈압')) lifelogKeywords.push('혈압');
  if (msg.includes('콜레스테롤') || msg.includes('지질')) lifelogKeywords.push('이상지질혈증');
  if (msg.includes('비타민') || msg.includes('영양')) lifelogKeywords.push('영양소');
  if (msg.includes('카페인') || msg.includes('커피')) lifelogKeywords.push('카페인');

  // 근거 논문 검색
  state.evidencePapers = evidenceDB.getRelevantEvidence(checkupCodes, dtcCodes, lifelogKeywords);

  // RAG 컨텍스트 생성
  state.ragContext = evidenceDB.generateRAGContext(state.evidencePapers);

  state.executionLog.push({ node: 'EvidenceRetriever', timestamp: new Date().toISOString(), duration: Date.now() - start, status: `${state.evidencePapers.length} papers found` });
  return state;
}

/**
 * Node 3: Analyzer
 * 수집된 데이터와 근거를 바탕으로 분석합니다.
 */
async function analyzerNode(state: GraphState): Promise<GraphState> {
  const start = Date.now();

  const findings: string[] = [];
  const insights: string[] = [];
  let riskAssessment = '전반적으로 양호';

  if (state.healthData) {
    // 이상 소견 분석
    const abnormal = state.healthData.checkupObservations.filter(o => o.status !== 'normal');
    if (abnormal.length > 5) riskAssessment = '다수 항목에서 관리 필요';
    else if (abnormal.length > 0) riskAssessment = '일부 항목 주의 필요';

    for (const obs of abnormal) {
      findings.push(`${obs.display}: ${obs.value}${obs.unit} (${obs.status})`);
    }

    // 유전체 고위험 + 검진 이상 교차
    for (const genetic of state.healthData.genomicHighRisk) {
      const matchedObs = state.healthData.checkupObservations.find(
        (o: any) => (genetic as any).relatedCheckupCodes?.includes(o.code) && o.status !== 'normal'
      );
      if (matchedObs) {
        insights.push(`유전적 고위험(${(genetic as any).name}) + 검진 이상(${matchedObs.display}) → 적극적 관리 필요`);
      }
    }

    // 라이프로그 기반 인사이트
    const avgSteps = state.healthData.wearableRecent.reduce((a, w) => a + (w.steps || 0), 0) / Math.max(state.healthData.wearableRecent.length, 1);
    const avgSleep = state.healthData.wearableRecent.reduce((a, w) => a + (w.sleepHours || 0), 0) / Math.max(state.healthData.wearableRecent.length, 1);

    if (avgSteps < 5000) insights.push('일일 걸음 수 부족 (5,000보 미만) - 활동량 증가 권장');
    if (avgSleep < 6) insights.push('수면 시간 부족 (6시간 미만) - 대사 건강에 부정적 영향');
  }

  state.analysisResult = { relevantFindings: findings, riskAssessment, actionableInsights: insights };

  state.executionLog.push({ node: 'Analyzer', timestamp: new Date().toISOString(), duration: Date.now() - start, status: `${findings.length} findings, ${insights.length} insights` });
  return state;
}

/**
 * Node 4: ResponseGenerator
 * LLM을 사용하여 최종 응답을 생성합니다.
 */
async function responseGeneratorNode(state: GraphState): Promise<GraphState> {
  const start = Date.now();

  const systemPrompt = `당신은 "MyHealth 건강 코치"입니다. 근거 기반 의학(Evidence-Based Medicine) 원칙에 따라 답변합니다.

## 핵심 원칙
1. 제공된 근거 문헌을 바탕으로 답변합니다.
2. 답변에 [출처 번호]를 반드시 표시합니다.
3. 근거에 없는 내용은 "근거 부족" 또는 "추가 연구 필요"로 명시합니다.
4. 진단, 처방, 치료 결정은 절대 하지 않습니다.
5. 한국어로 친근하고 이해하기 쉽게 답변합니다.

## 응답 구조
1. 요약 (1-2문장)
2. 근거 기반 설명 (논문 인용 포함)
3. 행동 제안 (구체적, 실천 가능한)
4. 참고사항 / 한계점
5. "정확한 진단과 치료는 의료진과 상담하세요" 안내

## 사용자 분석 결과
${state.analysisResult ? `- 위험 평가: ${state.analysisResult.riskAssessment}\n- 주요 소견: ${state.analysisResult.relevantFindings.join(', ')}\n- 인사이트: ${state.analysisResult.actionableInsights.join(', ')}` : '분석 데이터 없음'}`;

  // 데이터 컨텍스트
  let dataContext = '';
  if (state.healthData) {
    dataContext += '## 사용자 건강 데이터\n';
    if (state.healthData.lastCheckupDate) {
      dataContext += `검진일: ${state.healthData.lastCheckupDate}\n`;
      const abnormal = state.healthData.checkupObservations.filter(o => o.status !== 'normal');
      dataContext += `이상 소견: ${abnormal.map(o => `${o.display}=${o.value}${o.unit}(${o.status})`).join(', ')}\n`;
    }
    if (state.healthData.genomicHighRisk.length > 0) {
      dataContext += `유전적 고위험: ${state.healthData.genomicHighRisk.map((g: any) => g.name).join(', ')}\n`;
    }
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: state.ragContext },
    { role: 'system', content: dataContext },
    ...state.conversationHistory.slice(-4),
    { role: 'user', content: state.userMessage },
  ];

  try {
    state.response = await llmProvider.chatCompletion(messages);
  } catch (error: any) {
    state.response = `죄송합니다. 응답 생성 중 오류가 발생했습니다: ${error.message}\n\n관련 근거 논문은 다음과 같습니다:\n${state.evidencePapers.map((p, i) => `[${i + 1}] ${p.title} (${p.journal}, ${p.year})`).join('\n')}`;
  }

  // 인용 정보 추출
  state.citations = state.evidencePapers.map((p, idx) => ({
    index: idx + 1,
    title: p.title,
    year: p.year,
    finding: p.keyFindings[0] || '',
  }));

  state.executionLog.push({ node: 'ResponseGenerator', timestamp: new Date().toISOString(), duration: Date.now() - start, status: 'success' });
  return state;
}

/**
 * Node 5: SafetyChecker
 * 의료 안전장치를 검증합니다.
 */
async function safetyCheckerNode(state: GraphState): Promise<GraphState> {
  const start = Date.now();
  const flags: string[] = [];

  const response = state.response.toLowerCase();
  const message = state.userMessage.toLowerCase();

  // 응급 키워드 감지
  const emergencyKeywords = ['흉통', '호흡곤란', '의식저하', '편마비', '심한 두통', '각혈', '토혈'];
  for (const kw of emergencyKeywords) {
    if (message.includes(kw)) {
      flags.push('EMERGENCY_DETECTED');
      state.response = `⚠️ **응급 상황이 의심됩니다.**\n\n"${kw}" 증상이 있으시다면 즉시 119에 전화하거나 가까운 응급실을 방문하세요.\n\n---\n\n` + state.response;
      break;
    }
  }

  // 금지 표현 감지
  const prohibitedPatterns = ['진단합니다', '처방합니다', '복용을 중단', '용량을 변경', '치료법은'];
  for (const pattern of prohibitedPatterns) {
    if (response.includes(pattern)) {
      flags.push(`PROHIBITED_EXPRESSION: ${pattern}`);
      state.response = state.response.replace(new RegExp(pattern, 'g'), '[의료진 상담 필요]');
    }
  }

  // 면책 조항 확인 및 추가
  if (!response.includes('의료진') && !response.includes('상담')) {
    state.response += '\n\n---\n💡 *이 정보는 참고용이며, 정확한 진단과 치료는 의료진과 상담하세요.*';
  }

  state.safetyFlags = flags;
  state.executionLog.push({ node: 'SafetyChecker', timestamp: new Date().toISOString(), duration: Date.now() - start, status: flags.length > 0 ? `${flags.length} flags` : 'clean' });
  return state;
}

// ============================================================
// LangGraph 실행 엔진
// ============================================================

export class HealthCoachGraph {
  private nodes: Array<{ name: string; fn: NodeFunction }> = [
    { name: 'DataCollector', fn: dataCollectorNode },
    { name: 'EvidenceRetriever', fn: evidenceRetrieverNode },
    { name: 'Analyzer', fn: analyzerNode },
    { name: 'ResponseGenerator', fn: responseGeneratorNode },
    { name: 'SafetyChecker', fn: safetyCheckerNode },
  ];

  /**
   * 그래프 실행 (전체 파이프라인)
   */
  async invoke(userId: string, userMessage: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<GraphState> {
    let state: GraphState = {
      userId,
      userMessage,
      conversationHistory,
      healthData: null,
      evidencePapers: [],
      ragContext: '',
      analysisResult: null,
      response: '',
      citations: [],
      safetyFlags: [],
      executionLog: [],
    };

    console.log(`[LangGraph] Starting pipeline for user: ${userId}`);
    console.log(`[LangGraph] Message: "${userMessage.slice(0, 50)}..."`);

    for (const node of this.nodes) {
      try {
        state = await node.fn(state);
        console.log(`[LangGraph] ✓ ${node.name} completed`);
      } catch (error: any) {
        console.error(`[LangGraph] ✗ ${node.name} failed: ${error.message}`);
        state.executionLog.push({ node: node.name, timestamp: new Date().toISOString(), duration: 0, status: `error: ${error.message}` });

        // ResponseGenerator 실패 시 폴백
        if (node.name === 'ResponseGenerator') {
          state.response = `죄송합니다. 응답 생성에 실패했습니다.\n\n관련 근거 논문:\n${state.evidencePapers.map((p, i) => `[${i + 1}] ${p.title} (${p.year})`).join('\n')}\n\n의료진과 상담하시기 바랍니다.`;
        }
      }
    }

    console.log(`[LangGraph] Pipeline completed. Nodes: ${state.executionLog.length}, Citations: ${state.citations.length}, Flags: ${state.safetyFlags.length}`);
    return state;
  }

  /**
   * 리포트 생성용 실행 (더 상세한 분석)
   */
  async generateReport(userId: string): Promise<GraphState> {
    return this.invoke(userId, '내 전체 건강 데이터를 분석하여 종합 건강 리포트를 작성해주세요. 검진 수치, 유전체 결과, 생활 데이터를 모두 포함하여 근거 기반으로 분석하고, 구체적인 행동 계획을 제안해주세요.');
  }
}

export const healthCoachGraph = new HealthCoachGraph();
