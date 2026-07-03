/**
 * 본인인증 및 건강보험공단/심평원 건강검진 데이터 조회 서비스
 * 
 * 실제 구현 시:
 * - 본인인증: PASS, 카카오, 네이버, 공동인증서 등 연동
 * - 건강검진 조회: 건강보험공단 API 또는 건강정보 고속도로 경유
 * 
 * 현재: 전체 흐름을 시뮬레이션하여 구조적으로 준비
 */

// ============================================================
// 본인인증 타입
// ============================================================

export type IdentityProvider = 'pass' | 'kakao' | 'naver' | 'certificate';

export interface IdentityVerificationRequest {
  provider: IdentityProvider;
  name: string;
  birthDate: string;       // YYYYMMDD
  phone?: string;          // 010XXXXXXXX
  gender: 'male' | 'female';
}

export interface IdentityVerificationResult {
  verified: boolean;
  verificationId: string;
  ci?: string;             // 연계정보 (Connecting Information) - 기관 간 동일인 확인용
  di?: string;             // 중복가입확인정보
  name: string;
  birthDate: string;
  gender: string;
  phone?: string;
  verifiedAt: string;
  expiresAt: string;       // 인증 유효기간
  provider: IdentityProvider;
}

// ============================================================
// 건강검진 데이터 타입
// ============================================================

export interface NHISCheckupData {
  checkupDate: string;
  checkupType: string;     // 일반건강검진, 생애전환기, 암검진 등
  institution: string;     // 검진기관명
  results: NHISCheckupItem[];
  opinion?: string;        // 종합소견
  followUp?: string;       // 사후관리 소견
}

export interface NHISCheckupItem {
  category: string;
  itemName: string;
  itemCode: string;
  value: number | string;
  unit: string;
  status: 'normal' | 'caution' | 'warning' | 'critical';
  referenceRange?: string;
}

export interface NHISCheckupHistory {
  totalCount: number;
  checkups: Array<{
    year: number;
    date: string;
    type: string;
    institution: string;
    available: boolean;
  }>;
}

// ============================================================
// 본인인증 서비스
// ============================================================

class IdentityVerificationService {
  private verifications: Map<string, IdentityVerificationResult> = new Map();

  /**
   * 본인인증 요청
   * 실제: PASS/카카오/네이버 인증 모듈 호출 → 인증 팝업 → 콜백
   */
  async requestVerification(request: IdentityVerificationRequest): Promise<{ requestId: string; redirectUrl: string }> {
    const requestId = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    console.log(`[Identity] Verification requested: ${request.provider} / ${request.name}`);

    // 실제 구현에서는 각 인증 제공자의 SDK/API를 호출
    // 여기서는 시뮬레이션 URL 반환
    const redirectUrls: Record<IdentityProvider, string> = {
      pass: 'https://auth.passauth.co.kr/verify',
      kakao: 'https://kauth.kakao.com/oauth/authorize',
      naver: 'https://nid.naver.com/oauth2.0/authorize',
      certificate: 'https://cert.vno.co.kr/verify',
    };

    return {
      requestId,
      redirectUrl: `${redirectUrls[request.provider]}?requestId=${requestId}`,
    };
  }

  /**
   * 본인인증 완료 처리 (콜백)
   * 실제: 인증 제공자로부터 CI/DI 수신
   */
  async completeVerification(requestId: string, callbackData?: any): Promise<IdentityVerificationResult> {
    // 시뮬레이션: 인증 성공
    const result: IdentityVerificationResult = {
      verified: true,
      verificationId: requestId,
      ci: `CI_${Math.random().toString(36).slice(2, 30).toUpperCase()}`,
      di: `DI_${Math.random().toString(36).slice(2, 20).toUpperCase()}`,
      name: callbackData?.name || '김건강',
      birthDate: callbackData?.birthDate || '19850315',
      gender: callbackData?.gender || 'male',
      phone: callbackData?.phone || '01012345678',
      verifiedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간
      provider: callbackData?.provider || 'kakao',
    };

    this.verifications.set(requestId, result);
    return result;
  }

  /**
   * 인증 상태 확인
   */
  getVerification(verificationId: string): IdentityVerificationResult | null {
    return this.verifications.get(verificationId) || null;
  }

  /**
   * 인증 유효성 확인
   */
  isVerificationValid(verificationId: string): boolean {
    const v = this.verifications.get(verificationId);
    if (!v) return false;
    return v.verified && new Date(v.expiresAt) > new Date();
  }
}

// ============================================================
// 건강보험공단 건강검진 조회 서비스
// ============================================================

class NHISCheckupService {
  /**
   * 건강검진 이력 조회
   * 실제: 건강보험공단 API 또는 건강정보 고속도로 공공데이터 조회 API 사용
   * 필수: 본인인증 완료 (CI 필요)
   */
  async getCheckupHistory(ci: string): Promise<NHISCheckupHistory> {
    console.log(`[NHIS] Fetching checkup history for CI: ${ci.slice(0, 8)}...`);

    // 시뮬레이션 데이터
    return {
      totalCount: 5,
      checkups: [
        { year: 2024, date: '2024-06-15', type: '일반건강검진', institution: '서울건강검진센터', available: true },
        { year: 2023, date: '2023-06-20', type: '일반건강검진', institution: '서울건강검진센터', available: true },
        { year: 2022, date: '2022-07-10', type: '일반건강검진', institution: '강남메디컬센터', available: true },
        { year: 2021, date: '2021-05-25', type: '생애전환기 건강검진', institution: '서울대학교병원', available: true },
        { year: 2020, date: '2020-08-12', type: '일반건강검진', institution: '강남메디컬센터', available: true },
      ],
    };
  }

  /**
   * 특정 연도 건강검진 상세 결과 조회
   */
  async getCheckupDetail(ci: string, year: number): Promise<NHISCheckupData> {
    console.log(`[NHIS] Fetching checkup detail for year: ${year}`);

    // 연도별 약간 다른 시뮬레이션 데이터 생성
    const baseValues: Record<string, { base: number; trend: number }> = {
      BMI: { base: 26.8, trend: -0.3 },
      BP_SYS: { base: 138, trend: -2 },
      BP_DIA: { base: 88, trend: -1 },
      FBS: { base: 112, trend: 3 },
      HBA1C: { base: 5.9, trend: 0.15 },
      TC: { base: 228, trend: 5 },
      LDL: { base: 148, trend: 3 },
      HDL: { base: 42, trend: -1 },
      TG: { base: 185, trend: 8 },
      AST: { base: 32, trend: 1 },
      ALT: { base: 45, trend: 2 },
      GGT: { base: 68, trend: 3 },
      CREATININE: { base: 0.9, trend: 0 },
      HEMOGLOBIN: { base: 15.2, trend: 0 },
      WBC: { base: 6800, trend: 0 },
    };

    const yearDiff = 2024 - year;
    const getValue = (code: string) => {
      const item = baseValues[code];
      if (!item) return 0;
      return Math.round((item.base - item.trend * yearDiff) * 10) / 10;
    };

    const getStatus = (value: number, low: number, high: number): 'normal' | 'caution' | 'warning' | 'critical' => {
      if (value > high * 1.5 || value < low * 0.5) return 'critical';
      if (value > high * 1.2 || value < low * 0.7) return 'warning';
      if (value > high || value < low) return 'caution';
      return 'normal';
    };

    const results: NHISCheckupItem[] = [
      { category: '신체계측', itemName: '체질량지수(BMI)', itemCode: 'BMI', value: getValue('BMI'), unit: 'kg/m²', status: getStatus(getValue('BMI'), 18.5, 24.9), referenceRange: '18.5 ~ 24.9' },
      { category: '혈압', itemName: '수축기 혈압', itemCode: 'BP_SYS', value: getValue('BP_SYS'), unit: 'mmHg', status: getStatus(getValue('BP_SYS'), 90, 130), referenceRange: '90 ~ 130' },
      { category: '혈압', itemName: '이완기 혈압', itemCode: 'BP_DIA', value: getValue('BP_DIA'), unit: 'mmHg', status: getStatus(getValue('BP_DIA'), 60, 85), referenceRange: '60 ~ 85' },
      { category: '혈당', itemName: '공복혈당', itemCode: 'FBS', value: getValue('FBS'), unit: 'mg/dL', status: getStatus(getValue('FBS'), 70, 99), referenceRange: '70 ~ 99' },
      { category: '혈당', itemName: '당화혈색소(HbA1c)', itemCode: 'HBA1C', value: getValue('HBA1C'), unit: '%', status: getStatus(getValue('HBA1C'), 4.0, 5.6), referenceRange: '4.0 ~ 5.6' },
      { category: '지질', itemName: '총콜레스테롤', itemCode: 'TC', value: getValue('TC'), unit: 'mg/dL', status: getStatus(getValue('TC'), 0, 200), referenceRange: '< 200' },
      { category: '지질', itemName: 'LDL 콜레스테롤', itemCode: 'LDL', value: getValue('LDL'), unit: 'mg/dL', status: getStatus(getValue('LDL'), 0, 130), referenceRange: '< 130' },
      { category: '지질', itemName: 'HDL 콜레스테롤', itemCode: 'HDL', value: getValue('HDL'), unit: 'mg/dL', status: getStatus(getValue('HDL'), 60, 100), referenceRange: '> 60' },
      { category: '지질', itemName: '중성지방', itemCode: 'TG', value: getValue('TG'), unit: 'mg/dL', status: getStatus(getValue('TG'), 0, 150), referenceRange: '< 150' },
      { category: '간기능', itemName: 'AST(SGOT)', itemCode: 'AST', value: getValue('AST'), unit: 'U/L', status: getStatus(getValue('AST'), 0, 40), referenceRange: '< 40' },
      { category: '간기능', itemName: 'ALT(SGPT)', itemCode: 'ALT', value: getValue('ALT'), unit: 'U/L', status: getStatus(getValue('ALT'), 0, 35), referenceRange: '< 35' },
      { category: '간기능', itemName: 'γ-GTP', itemCode: 'GGT', value: getValue('GGT'), unit: 'U/L', status: getStatus(getValue('GGT'), 0, 63), referenceRange: '< 63' },
      { category: '신장기능', itemName: '크레아티닌', itemCode: 'CREATININE', value: getValue('CREATININE'), unit: 'mg/dL', status: getStatus(getValue('CREATININE'), 0.5, 1.2), referenceRange: '0.5 ~ 1.2' },
      { category: '혈액', itemName: '혈색소', itemCode: 'HEMOGLOBIN', value: getValue('HEMOGLOBIN'), unit: 'g/dL', status: getStatus(getValue('HEMOGLOBIN'), 13, 17), referenceRange: '13 ~ 17' },
      { category: '혈액', itemName: '백혈구 수', itemCode: 'WBC', value: getValue('WBC'), unit: '/μL', status: getStatus(getValue('WBC'), 4000, 10000), referenceRange: '4,000 ~ 10,000' },
    ];

    const abnormalCount = results.filter(r => r.status !== 'normal').length;

    return {
      checkupDate: `${year}-06-15`,
      checkupType: year === 2021 ? '생애전환기 건강검진' : '일반건강검진',
      institution: year >= 2023 ? '서울건강검진센터' : '강남메디컬센터',
      results,
      opinion: abnormalCount > 0
        ? `총 ${results.length}개 항목 중 ${abnormalCount}개 항목에서 이상 소견이 확인되었습니다. 생활습관 개선 및 정기적인 추적 검사를 권장합니다.`
        : '전체 검사 항목이 정상 범위 내에 있습니다.',
      followUp: abnormalCount > 3
        ? '3개월 이내 재검 및 전문의 상담을 권장합니다.'
        : '1년 후 정기 건강검진을 받으시기 바랍니다.',
    };
  }
}

export const identityService = new IdentityVerificationService();
export const nhisCheckupService = new NHISCheckupService();
