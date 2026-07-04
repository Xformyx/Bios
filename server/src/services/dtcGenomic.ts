/**
 * DTC 유전체 데이터 연동 서비스
 * 마크로젠(젠톡) / 제노플랜코리아 DTC 유전자검사 결과 연동
 * 
 * 참조:
 * - DTC 인증 기관: https://nibp.kr/dtc/frt/frt40/frt401020
 * - 마크로젠: 218개 항목, 4807개 마커
 * - 제노플랜: 206개 항목, 65106개 마커
 * 
 * 결과 표현: 3단계 (높음/보통/낮음)
 */

export type DTCProvider = 'macrogen' | 'genoplan';
export type RiskLevel = 'high' | 'average' | 'low';

export interface DTCCategory {
  id: string;
  name: string;
  description: string;
  items: DTCItem[];
}

export interface DTCItem {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  riskLevel: RiskLevel;
  percentile?: number;        // 상위 몇 % (예: 15 = 상위 15%)
  description: string;
  recommendation?: string;
  relatedCheckupCodes?: string[];  // 연관된 검진 항목 코드 (BMI, FBS, TC 등)
  markers?: number;           // 분석에 사용된 마커 수
  confidence?: number;        // 신뢰도 (0~1)
}

export interface DTCReport {
  id: string;
  userId: string;
  provider: DTCProvider;
  reportDate: string;
  sampleId?: string;
  categories: DTCCategory[];
  summary: DTCSummary;
  createdAt: string;
}

export interface DTCSummary {
  totalItems: number;
  highRiskCount: number;
  averageRiskCount: number;
  lowRiskCount: number;
  topRiskItems: DTCItem[];
  healthRelevantItems: DTCItem[];  // 검진 수치와 연관된 항목
}

export interface DTCConnectionConfig {
  provider: DTCProvider;
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  userId?: string;            // 제공자 측 사용자 ID
  connected: boolean;
  lastSync?: string;
}

// ============================================================
// DTC 검사 항목 정의 (마크로젠/제노플랜 공통 주요 항목)
// ============================================================

const DTC_CATEGORIES: DTCCategory[] = [
  {
    id: 'health-management',
    name: '건강관리',
    description: '대사 지표 및 만성질환 예방 관련 유전적 경향',
    items: [
      { id: 'dtc-bmi', code: 'DTC_BMI', name: '체질량지수(BMI)', category: '건강관리', riskLevel: 'average', percentile: 55, description: '비만 관련 유전적 경향', relatedCheckupCodes: ['BMI'], markers: 97 },
      { id: 'dtc-triglyceride', code: 'DTC_TG', name: '중성지방 농도', category: '건강관리', riskLevel: 'high', percentile: 22, description: '중성지방 수치 상승 유전적 경향', relatedCheckupCodes: ['TG'], markers: 68 },
      { id: 'dtc-cholesterol', code: 'DTC_TC', name: '콜레스테롤', category: '건강관리', riskLevel: 'high', percentile: 18, description: '총콜레스테롤 상승 유전적 경향', relatedCheckupCodes: ['TC', 'LDL'], markers: 85 },
      { id: 'dtc-hdl', code: 'DTC_HDL', name: 'HDL 콜레스테롤', category: '건강관리', riskLevel: 'low', percentile: 72, description: 'HDL 콜레스테롤 수치 유전적 경향', relatedCheckupCodes: ['HDL'], markers: 54 },
      { id: 'dtc-glucose', code: 'DTC_FBS', name: '혈당', category: '건강관리', riskLevel: 'high', percentile: 15, description: '공복혈당 상승 유전적 경향', relatedCheckupCodes: ['FBS', 'HBA1C'], markers: 112 },
      { id: 'dtc-bp', code: 'DTC_BP', name: '혈압', category: '건강관리', riskLevel: 'high', percentile: 20, description: '고혈압 유전적 경향', relatedCheckupCodes: ['BP_SYS', 'BP_DIA'], markers: 93 },
      { id: 'dtc-uric', code: 'DTC_URIC', name: '요산치', category: '건강관리', riskLevel: 'average', percentile: 45, description: '요산 수치 상승 유전적 경향', markers: 41 },
    ],
  },
  {
    id: 'disease-susceptibility',
    name: '질병 감수성',
    description: '주요 질환에 대한 유전적 감수성 (질병 예방 목적)',
    items: [
      { id: 'dtc-t2dm', code: 'DTC_T2DM', name: '제2형 당뇨병 감수성', category: '질병 감수성', riskLevel: 'high', percentile: 12, description: '제2형 당뇨병 발생 유전적 감수성', relatedCheckupCodes: ['FBS', 'HBA1C'], markers: 245 },
      { id: 'dtc-htn', code: 'DTC_HTN', name: '고혈압 감수성', category: '질병 감수성', riskLevel: 'high', percentile: 18, description: '본태성 고혈압 유전적 감수성', relatedCheckupCodes: ['BP_SYS', 'BP_DIA'], markers: 198 },
      { id: 'dtc-cad', code: 'DTC_CAD', name: '관상동맥질환 감수성', category: '질병 감수성', riskLevel: 'average', percentile: 38, description: '관상동맥질환 유전적 감수성', relatedCheckupCodes: ['TC', 'LDL', 'TG'], markers: 312 },
      { id: 'dtc-stroke', code: 'DTC_STROKE', name: '뇌졸중 감수성', category: '질병 감수성', riskLevel: 'average', percentile: 42, description: '뇌졸중 유전적 감수성', relatedCheckupCodes: ['BP_SYS'], markers: 156 },
      { id: 'dtc-afib', code: 'DTC_AFIB', name: '심방세동 감수성', category: '질병 감수성', riskLevel: 'low', percentile: 68, description: '심방세동 유전적 감수성', markers: 89 },
      { id: 'dtc-osteo', code: 'DTC_OSTEO', name: '골관절염 감수성', category: '질병 감수성', riskLevel: 'average', percentile: 50, description: '골관절염 유전적 감수성', markers: 67 },
      { id: 'dtc-macula', code: 'DTC_MACULA', name: '황반변성 감수성', category: '질병 감수성', riskLevel: 'low', percentile: 75, description: '황반변성 유전적 감수성', markers: 45 },
      { id: 'dtc-colorectal', code: 'DTC_CRC', name: '대장암 감수성', category: '질병 감수성', riskLevel: 'average', percentile: 35, description: '대장암 유전적 감수성', markers: 178 },
      { id: 'dtc-gastric', code: 'DTC_GC', name: '위암 감수성', category: '질병 감수성', riskLevel: 'low', percentile: 62, description: '위암 유전적 감수성', markers: 134 },
      { id: 'dtc-lung', code: 'DTC_LC', name: '폐암 감수성', category: '질병 감수성', riskLevel: 'low', percentile: 70, description: '폐암 유전적 감수성', markers: 98 },
    ],
  },
  {
    id: 'nutrient-metabolism',
    name: '영양소 대사',
    description: '영양소 흡수 및 대사 관련 유전적 특성',
    items: [
      { id: 'dtc-vitd', code: 'DTC_VITD', name: '비타민 D 대사', category: '영양소 대사', riskLevel: 'high', percentile: 20, description: '비타민 D 결핍 유전적 경향', markers: 28 },
      { id: 'dtc-vitc', code: 'DTC_VITC', name: '비타민 C 대사', category: '영양소 대사', riskLevel: 'average', percentile: 48, description: '비타민 C 요구량 유전적 경향', markers: 15 },
      { id: 'dtc-vitb12', code: 'DTC_VITB12', name: '비타민 B12 대사', category: '영양소 대사', riskLevel: 'average', percentile: 52, description: '비타민 B12 대사 유전적 경향', markers: 12 },
      { id: 'dtc-calcium', code: 'DTC_CA', name: '칼슘 대사', category: '영양소 대사', riskLevel: 'low', percentile: 65, description: '칼슘 흡수 유전적 경향', markers: 18 },
      { id: 'dtc-iron', code: 'DTC_FE', name: '철 대사', category: '영양소 대사', riskLevel: 'average', percentile: 40, description: '철분 대사 유전적 경향', markers: 22 },
      { id: 'dtc-omega3', code: 'DTC_OMEGA3', name: '오메가3 대사', category: '영양소 대사', riskLevel: 'high', percentile: 25, description: '오메가3 지방산 대사 유전적 경향', markers: 19 },
      { id: 'dtc-caffeine', code: 'DTC_CAFFEINE', name: '카페인 대사', category: '영양소 대사', riskLevel: 'high', percentile: 15, description: '카페인 대사 속도 (느린 대사자)', markers: 8 },
      { id: 'dtc-lactose', code: 'DTC_LACTOSE', name: '유당 분해', category: '영양소 대사', riskLevel: 'average', percentile: 55, description: '유당불내증 유전적 경향', markers: 5 },
      { id: 'dtc-alcohol', code: 'DTC_ALCOHOL', name: '알코올 대사', category: '영양소 대사', riskLevel: 'low', percentile: 80, description: '알코올 대사 능력', markers: 12 },
    ],
  },
  {
    id: 'fitness',
    name: '운동/체력',
    description: '운동 적합성 및 체력 관련 유전적 특성',
    items: [
      { id: 'dtc-muscle', code: 'DTC_MUSCLE', name: '근력 운동 적합성', category: '운동/체력', riskLevel: 'average', percentile: 50, description: '근력 운동 반응 유전적 경향', markers: 35 },
      { id: 'dtc-aerobic', code: 'DTC_AEROBIC', name: '유산소 운동 적합성', category: '운동/체력', riskLevel: 'high', percentile: 25, description: '유산소 운동 능력 유전적 경향 (높음 = 적합)', markers: 42 },
      { id: 'dtc-recovery', code: 'DTC_RECOVERY', name: '운동 후 회복력', category: '운동/체력', riskLevel: 'average', percentile: 45, description: '운동 후 회복 속도 유전적 경향', markers: 28 },
      { id: 'dtc-endurance', code: 'DTC_ENDURANCE', name: '지구력', category: '운동/체력', riskLevel: 'low', percentile: 60, description: '지구력 유전적 경향', markers: 31 },
    ],
  },
  {
    id: 'lifestyle',
    name: '생활습관',
    description: '수면, 스트레스 등 생활습관 관련 유전적 특성',
    items: [
      { id: 'dtc-sleep', code: 'DTC_SLEEP', name: '수면 패턴', category: '생활습관', riskLevel: 'high', percentile: 22, description: '불면/수면 장애 유전적 경향', markers: 45 },
      { id: 'dtc-insomnia', code: 'DTC_INSOMNIA', name: '불면증 감수성', category: '생활습관', riskLevel: 'high', percentile: 18, description: '불면증 유전적 감수성', markers: 38 },
      { id: 'dtc-stress', code: 'DTC_STRESS', name: '스트레스 감수성', category: '생활습관', riskLevel: 'average', percentile: 40, description: '스트레스 반응 유전적 경향', markers: 52 },
      { id: 'dtc-nicotine', code: 'DTC_NICOTINE', name: '니코틴 의존성', category: '생활습관', riskLevel: 'low', percentile: 72, description: '니코틴 의존 유전적 경향', markers: 25 },
      { id: 'dtc-pain', code: 'DTC_PAIN', name: '통증 민감성', category: '생활습관', riskLevel: 'average', percentile: 48, description: '통증 민감도 유전적 경향', markers: 33 },
    ],
  },
  {
    id: 'skin-appearance',
    name: '피부/외모',
    description: '피부 및 외모 관련 유전적 특성',
    items: [
      { id: 'dtc-skin-aging', code: 'DTC_SKIN_AGE', name: '피부노화', category: '피부/외모', riskLevel: 'average', percentile: 50, description: '피부 노화 속도 유전적 경향', markers: 42 },
      { id: 'dtc-pigment', code: 'DTC_PIGMENT', name: '색소침착', category: '피부/외모', riskLevel: 'high', percentile: 28, description: '색소침착 유전적 경향', markers: 18 },
      { id: 'dtc-hair-loss', code: 'DTC_HAIRLOSS', name: '탈모 (남성형)', category: '피부/외모', riskLevel: 'high', percentile: 20, description: '남성형 탈모 유전적 경향', markers: 55 },
      { id: 'dtc-hair-thick', code: 'DTC_HAIR_THICK', name: '모발 굵기', category: '피부/외모', riskLevel: 'average', percentile: 50, description: '모발 굵기 유전적 경향', markers: 12 },
    ],
  },
];

// ============================================================
// DTC 서비스 클래스
// ============================================================

class DTCGenomicService {
  private reports: Map<string, DTCReport> = new Map();
  private connections: Map<string, DTCConnectionConfig> = new Map();

  // --------------------------------------------------------
  // 연동 설정
  // --------------------------------------------------------

  getConnectionConfig(userId: string): DTCConnectionConfig[] {
    return [
      {
        provider: 'macrogen',
        baseUrl: 'https://api.macrogen.com/v1/dtc',
        connected: this.connections.has(`${userId}-macrogen`),
        lastSync: this.connections.get(`${userId}-macrogen`)?.lastSync,
        ...(this.connections.get(`${userId}-macrogen`) || {}),
      },
      {
        provider: 'genoplan',
        baseUrl: 'https://api.genoplan.com/v2/results',
        connected: this.connections.has(`${userId}-genoplan`),
        lastSync: this.connections.get(`${userId}-genoplan`)?.lastSync,
        ...(this.connections.get(`${userId}-genoplan`) || {}),
      },
    ];
  }

  async connectProvider(userId: string, provider: DTCProvider, config: { apiKey: string; apiSecret?: string; userId?: string }): Promise<{ success: boolean; message: string }> {
    /*
    // 실제 구현: 마크로젠/제노플랜 API로 인증 확인
    const baseUrl = provider === 'macrogen' ? 'https://api.macrogen.com/v1/dtc' : 'https://api.genoplan.com/v2/results';
    const response = await fetch(`${baseUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: config.userId }),
    });
    */

    this.connections.set(`${userId}-${provider}`, {
      provider,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: provider === 'macrogen' ? 'https://api.macrogen.com/v1/dtc' : 'https://api.genoplan.com/v2/results',
      userId: config.userId,
      connected: true,
      lastSync: new Date().toISOString(),
    });

    return { success: true, message: `${provider === 'macrogen' ? '마크로젠' : '제노플랜'} 연동이 완료되었습니다.` };
  }

  disconnectProvider(userId: string, provider: DTCProvider): void {
    this.connections.delete(`${userId}-${provider}`);
  }

  // --------------------------------------------------------
  // 유전체 결과 조회
  // --------------------------------------------------------

  async fetchResults(userId: string, provider: DTCProvider): Promise<DTCReport> {
    /*
    // 실제 구현: 마크로젠 API
    if (provider === 'macrogen') {
      const config = this.connections.get(`${userId}-macrogen`);
      const response = await fetch(`${config.baseUrl}/results`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}`, 'X-User-ID': config.userId },
      });
      const data = await response.json();
      return this.normalizeMacrogenResult(data);
    }
    // 실제 구현: 제노플랜 API
    if (provider === 'genoplan') {
      const config = this.connections.get(`${userId}-genoplan`);
      const response = await fetch(`${config.baseUrl}/report`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
      });
      const data = await response.json();
      return this.normalizeGenoplanResult(data);
    }
    */

    // 시뮬레이션: 현실적인 DTC 결과 생성
    return this.generateSimulatedReport(userId, provider);
  }

  getReport(userId: string): DTCReport | null {
    return this.reports.get(userId) || null;
  }

  // --------------------------------------------------------
  // AI 코치용 유전체 컨텍스트 생성
  // --------------------------------------------------------

  getGenomicContextForAI(userId: string): string | null {
    const report = this.reports.get(userId);
    if (!report) return null;

    let context = '## 사용자 DTC 유전체 검사 결과\n\n';
    context += `검사 기관: ${report.provider === 'macrogen' ? '마크로젠' : '제노플랜'}\n`;
    context += `검사일: ${report.reportDate}\n\n`;

    // 고위험 항목
    const highRiskItems = report.categories.flatMap(c => c.items).filter(i => i.riskLevel === 'high');
    if (highRiskItems.length > 0) {
      context += '### 유전적 고위험 항목\n';
      for (const item of highRiskItems) {
        context += `- ${item.name}: 높음 (상위 ${item.percentile}%) - ${item.description}\n`;
      }
      context += '\n';
    }

    // 검진 수치와 연관된 항목
    const healthItems = report.categories.flatMap(c => c.items).filter(i => i.relatedCheckupCodes && i.relatedCheckupCodes.length > 0);
    if (healthItems.length > 0) {
      context += '### 검진 수치 연관 유전적 경향\n';
      for (const item of healthItems) {
        const level = item.riskLevel === 'high' ? '높음' : item.riskLevel === 'low' ? '낮음' : '보통';
        context += `- ${item.name} (${level}): 연관 검사항목 [${item.relatedCheckupCodes!.join(', ')}]\n`;
      }
      context += '\n';
    }

    context += '### 참고사항\n';
    context += '- DTC 유전자검사 결과는 유전적 경향을 나타내며, 실제 발병을 확정하지 않습니다.\n';
    context += '- 생활습관, 환경, 식이 등 후천적 요인이 실제 건강에 더 큰 영향을 줄 수 있습니다.\n';
    context += '- 유전적 고위험이라도 적극적인 생활습관 관리로 위험을 낮출 수 있습니다.\n';

    return context;
  }

  /**
   * 검진 수치와 유전체 결과를 교차 분석하여 인사이트 생성
   */
  getCrossAnalysis(userId: string, checkupObservations: Array<{ code: string; value: number; status: string }>): Array<{ checkupItem: string; geneticItem: string; riskLevel: RiskLevel; insight: string }> {
    const report = this.reports.get(userId);
    if (!report) return [];

    const allItems = report.categories.flatMap(c => c.items);
    const insights: Array<{ checkupItem: string; geneticItem: string; riskLevel: RiskLevel; insight: string }> = [];

    for (const obs of checkupObservations) {
      const relatedGenetic = allItems.filter(i => i.relatedCheckupCodes?.includes(obs.code));
      for (const genetic of relatedGenetic) {
        if (genetic.riskLevel === 'high' && obs.status !== 'normal') {
          insights.push({
            checkupItem: obs.code,
            geneticItem: genetic.name,
            riskLevel: genetic.riskLevel,
            insight: `${genetic.name}에 대한 유전적 경향이 높고(상위 ${genetic.percentile}%), 실제 검진 수치도 정상 범위를 벗어났습니다. 적극적인 관리가 권장됩니다.`,
          });
        } else if (genetic.riskLevel === 'high' && obs.status === 'normal') {
          insights.push({
            checkupItem: obs.code,
            geneticItem: genetic.name,
            riskLevel: genetic.riskLevel,
            insight: `${genetic.name}에 대한 유전적 경향은 높지만, 현재 검진 수치는 정상입니다. 현재의 생활습관을 유지하면서 정기적 모니터링을 권장합니다.`,
          });
        }
      }
    }

    return insights;
  }

  // --------------------------------------------------------
  // 시뮬레이션 데이터 생성
  // --------------------------------------------------------

  private generateSimulatedReport(userId: string, provider: DTCProvider): DTCReport {
    const categories = DTC_CATEGORIES.map(cat => ({ ...cat, items: cat.items.map(item => ({ ...item })) }));
    const allItems = categories.flatMap(c => c.items);

    const report: DTCReport = {
      id: crypto.randomUUID(),
      userId,
      provider,
      reportDate: '2024-05-20',
      sampleId: `SAMPLE-${provider.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      categories,
      summary: {
        totalItems: allItems.length,
        highRiskCount: allItems.filter(i => i.riskLevel === 'high').length,
        averageRiskCount: allItems.filter(i => i.riskLevel === 'average').length,
        lowRiskCount: allItems.filter(i => i.riskLevel === 'low').length,
        topRiskItems: allItems.filter(i => i.riskLevel === 'high').sort((a, b) => (a.percentile || 50) - (b.percentile || 50)).slice(0, 5),
        healthRelevantItems: allItems.filter(i => i.relatedCheckupCodes && i.relatedCheckupCodes.length > 0),
      },
      createdAt: new Date().toISOString(),
    };

    this.reports.set(userId, report);
    return report;
  }
}

export const dtcGenomicService = new DTCGenomicService();
