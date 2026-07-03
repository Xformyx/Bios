/**
 * 건강정보 고속도로 (MyHealthWay) 테스트베드 연동 모듈
 * 
 * 참조:
 * - 건강정보 고속도로 포털: https://www.myhealthway.go.kr
 * - 테스트베드: https://www.myhealthway.go.kr:8443/portal/
 * - KR Core IG: https://www.hl7korea.or.kr/fhir/krcore/
 * - SMART on FHIR: https://build.fhir.org/ig/HL7/smart-app-launch/
 * 
 * 이 모듈은 건강정보 고속도로 테스트베드 연동이 승인되었을 때
 * 바로 붙일 수 있도록 구조적으로 준비된 커넥터입니다.
 * 
 * API 구분 (건강정보 고속도로 공식 가이드 기준):
 * 1. 데이터 조회 API - 의료데이터/공공데이터 조회
 * 2. 동적동의 API - 제공동의/활용동의
 * 3. 지원 API - 인증, 연계지원, 플랫폼 이용, 방문기록, 기초데이터
 * 4. 활용서비스 지원 API - 플랫폼 지원, 통계제공
 */

// ============================================================
// 설정 (Configuration)
// ============================================================

export interface MyHealthWayConfig {
  // 테스트베드 환경 설정
  baseUrl: string;                    // 건강정보 고속도로 플랫폼 URL
  testbedUrl: string;                 // 테스트베드 URL
  clientId: string;                   // 활용서비스 클라이언트 ID
  clientSecret: string;               // 활용서비스 클라이언트 시크릿
  redirectUri: string;                // OAuth2 콜백 URI
  encryptionKeyId: string;            // 데이터 암호화 키 ID

  // FHIR 서버 설정
  fhirBaseUrl: string;                // FHIR 서버 엔드포인트
  fhirVersion: 'R4' | 'R5';          // FHIR 버전

  // 인증 설정
  authEndpoint: string;               // OAuth2 인증 엔드포인트
  tokenEndpoint: string;              // OAuth2 토큰 엔드포인트
  identityProvider: string;           // 본인인증 제공자 (naver, kakao, pass)
}

// 기본 테스트베드 설정
export const DEFAULT_CONFIG: MyHealthWayConfig = {
  baseUrl: 'https://www.myhealthway.go.kr',
  testbedUrl: 'https://www.myhealthway.go.kr:8443',
  clientId: process.env.MYHEALTHWAY_CLIENT_ID || 'testbed-client-id',
  clientSecret: process.env.MYHEALTHWAY_CLIENT_SECRET || 'testbed-client-secret',
  redirectUri: process.env.MYHEALTHWAY_REDIRECT_URI || 'http://localhost:3001/api/myhealthway/callback',
  encryptionKeyId: process.env.MYHEALTHWAY_ENCRYPTION_KEY_ID || 'testbed-key-001',
  fhirBaseUrl: 'https://www.myhealthway.go.kr:8443/fhir',
  fhirVersion: 'R4',
  authEndpoint: 'https://www.myhealthway.go.kr:8443/oauth2/authorize',
  tokenEndpoint: 'https://www.myhealthway.go.kr:8443/oauth2/token',
  identityProvider: 'kakao',
};

// ============================================================
// FHIR 리소스 타입 (건강정보 고속도로 12개 항목)
// ============================================================

/** 건강정보 고속도로에서 제공하는 12개 FHIR 리소스 타입 */
export type MyHealthWayResourceType =
  | 'Patient'              // 환자정보
  | 'Organization'         // 의료기관정보
  | 'Practitioner'         // 진료의정보
  | 'PractitionerRole'     // 진료의역할정보
  | 'Condition'            // 진단내역
  | 'MedicationRequest'    // 약물 처방 내역
  | 'Observation'          // 진단검사 + 기타검사
  | 'ImagingStudy'         // 영상검사
  | 'DiagnosticReport'     // 병리검사
  | 'Procedure'            // 수술 및 처치내역
  | 'AllergyIntolerance'   // 알레르기 및 불내성
  | 'DocumentReference';   // 진료기록 및 기타문서

/** FHIR Bundle 응답 구조 */
export interface FHIRBundle {
  resourceType: 'Bundle';
  id?: string;
  type: 'searchset' | 'batch' | 'transaction' | 'collection';
  total?: number;
  link?: Array<{ relation: string; url: string }>;
  entry?: Array<{
    fullUrl?: string;
    resource: FHIRResource;
    search?: { mode: string; score?: number };
  }>;
}

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
    source?: string;
  };
  [key: string]: any;
}

// ============================================================
// SMART on FHIR 인증 (OAuth 2.0 Authorization Code Flow)
// ============================================================

export interface SMARTAuthState {
  state: string;
  codeVerifier?: string;    // PKCE
  scope: string;
  redirectUri: string;
  createdAt: string;
  expiresAt: string;
}

export interface SMARTTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
  patient?: string;         // Patient FHIR ID
  id_token?: string;        // OpenID Connect ID Token
}

export interface ConsentRequest {
  patientId: string;
  providerId: string;       // 데이터 제공기관 ID
  dataCategories: MyHealthWayResourceType[];
  purpose: string;
  period: { start: string; end: string };
}

export interface ConsentResponse {
  consentId: string;
  status: 'active' | 'rejected' | 'pending';
  grantedCategories: MyHealthWayResourceType[];
  grantedAt?: string;
}

// ============================================================
// MyHealthWay 커넥터 클래스
// ============================================================

export class MyHealthWayConnector {
  private config: MyHealthWayConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshToken: string | null = null;
  private patientId: string | null = null;

  constructor(config: Partial<MyHealthWayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------
  // 1. 인증 API (SMART on FHIR / OAuth 2.0)
  // --------------------------------------------------------

  /**
   * SMART on FHIR 인증 URL 생성
   * 사용자를 이 URL로 리다이렉트하여 본인인증 + 동의를 받음
   */
  generateAuthorizationUrl(scopes: string[] = ['patient/*.read', 'openid', 'fhirUser']): { url: string; state: string } {
    const state = this.generateRandomString(32);
    const scope = scopes.join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope,
      state,
      aud: this.config.fhirBaseUrl,
      // 본인인증 제공자 지정
      identity_provider: this.config.identityProvider,
    });

    return {
      url: `${this.config.authEndpoint}?${params.toString()}`,
      state,
    };
  }

  /**
   * Authorization Code를 Access Token으로 교환
   * OAuth2 콜백에서 받은 code를 사용
   */
  async exchangeCodeForToken(code: string): Promise<SMARTTokenResponse> {
    // 실제 구현에서는 HTTP POST 요청
    // 테스트베드에서는 시뮬레이션
    console.log(`[MyHealthWay] Exchanging authorization code for token...`);
    console.log(`[MyHealthWay] Token endpoint: ${this.config.tokenEndpoint}`);

    /*
    // 실제 구현 코드 (테스트베드 승인 후 활성화):
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    const tokenData = await response.json();
    */

    // 시뮬레이션 응답
    const tokenData: SMARTTokenResponse = {
      access_token: `mhw_test_${this.generateRandomString(40)}`,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: `mhw_refresh_${this.generateRandomString(40)}`,
      scope: 'patient/*.read openid fhirUser',
      patient: 'Patient/testbed-patient-001',
    };

    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    this.refreshToken = tokenData.refresh_token || null;
    this.patientId = tokenData.patient || null;

    return tokenData;
  }

  /**
   * Refresh Token으로 Access Token 갱신
   */
  async refreshAccessToken(): Promise<SMARTTokenResponse> {
    if (!this.refreshToken) {
      throw new Error('Refresh token이 없습니다. 재인증이 필요합니다.');
    }

    console.log(`[MyHealthWay] Refreshing access token...`);

    // 시뮬레이션
    const tokenData: SMARTTokenResponse = {
      access_token: `mhw_test_${this.generateRandomString(40)}`,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: this.refreshToken,
      scope: 'patient/*.read openid fhirUser',
      patient: this.patientId || undefined,
    };

    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    return tokenData;
  }

  /**
   * 토큰 유효성 확인 및 필요 시 갱신
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('인증되지 않았습니다. 먼저 인증을 완료하세요.');
    }
    if (this.tokenExpiresAt && this.tokenExpiresAt < new Date()) {
      await this.refreshAccessToken();
    }
    return this.accessToken!;
  }

  // --------------------------------------------------------
  // 2. 동적동의 API
  // --------------------------------------------------------

  /**
   * 데이터 제공동의 요청
   * 사용자가 특정 의료기관의 데이터를 활용서비스에 제공하는 것에 동의
   */
  async requestProviderConsent(request: ConsentRequest): Promise<ConsentResponse> {
    await this.ensureValidToken();
    console.log(`[MyHealthWay] Requesting provider consent for patient: ${request.patientId}`);
    console.log(`[MyHealthWay] Provider: ${request.providerId}, Categories: ${request.dataCategories.join(', ')}`);

    /*
    // 실제 구현:
    const response = await fetch(`${this.config.baseUrl}/api/consent/provider`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    */

    // 시뮬레이션
    return {
      consentId: `consent-mhw-${this.generateRandomString(12)}`,
      status: 'active',
      grantedCategories: request.dataCategories,
      grantedAt: new Date().toISOString(),
    };
  }

  /**
   * 활용동의 요청
   * 사용자가 활용서비스에서 데이터를 활용하는 것에 동의
   */
  async requestServiceConsent(patientId: string, dataCategories: MyHealthWayResourceType[], purpose: string): Promise<ConsentResponse> {
    await this.ensureValidToken();
    console.log(`[MyHealthWay] Requesting service consent for patient: ${patientId}`);

    return {
      consentId: `consent-svc-${this.generateRandomString(12)}`,
      status: 'active',
      grantedCategories: dataCategories,
      grantedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------
  // 3. 데이터 조회 API (FHIR RESTful)
  // --------------------------------------------------------

  /**
   * FHIR 리소스 검색 (Search)
   * GET [fhirBaseUrl]/[ResourceType]?[parameters]
   */
  async searchResource(resourceType: MyHealthWayResourceType, params: Record<string, string> = {}): Promise<FHIRBundle> {
    const token = await this.ensureValidToken();
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.config.fhirBaseUrl}/${resourceType}${queryString ? '?' + queryString : ''}`;

    console.log(`[MyHealthWay] FHIR Search: GET ${url}`);

    /*
    // 실제 구현:
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/fhir+json',
      },
    });
    return await response.json();
    */

    // 시뮬레이션 - 리소스 타입에 따른 테스트 데이터 반환
    return this.generateSimulatedBundle(resourceType, params);
  }

  /**
   * FHIR 리소스 단건 조회 (Read)
   * GET [fhirBaseUrl]/[ResourceType]/[id]
   */
  async readResource(resourceType: MyHealthWayResourceType, id: string): Promise<FHIRResource> {
    const token = await this.ensureValidToken();
    const url = `${this.config.fhirBaseUrl}/${resourceType}/${id}`;

    console.log(`[MyHealthWay] FHIR Read: GET ${url}`);

    // 시뮬레이션
    const bundle = await this.searchResource(resourceType, { _id: id });
    if (bundle.entry && bundle.entry.length > 0) {
      return bundle.entry[0].resource;
    }
    throw new Error(`Resource not found: ${resourceType}/${id}`);
  }

  /**
   * 환자의 전체 의료 데이터 조회 (Patient/$everything 유사)
   * 모든 카테고리의 데이터를 한 번에 조회
   */
  async getPatientEverything(patientId: string): Promise<FHIRBundle> {
    const token = await this.ensureValidToken();
    console.log(`[MyHealthWay] Fetching all data for patient: ${patientId}`);

    const allResources: FHIRResource[] = [];
    const resourceTypes: MyHealthWayResourceType[] = [
      'Patient', 'Condition', 'MedicationRequest', 'Observation',
      'DiagnosticReport', 'Procedure', 'AllergyIntolerance',
    ];

    for (const type of resourceTypes) {
      const bundle = await this.searchResource(type, { patient: patientId });
      if (bundle.entry) {
        allResources.push(...bundle.entry.map(e => e.resource));
      }
    }

    return {
      resourceType: 'Bundle',
      type: 'collection',
      total: allResources.length,
      entry: allResources.map(resource => ({
        fullUrl: `${this.config.fhirBaseUrl}/${resource.resourceType}/${resource.id}`,
        resource,
      })),
    };
  }

  // --------------------------------------------------------
  // 4. 의료기관 방문기록 API
  // --------------------------------------------------------

  /**
   * 의료기관 방문기록 조회
   * 데이터 조회 대상 의료기관 목록을 확인
   */
  async getVisitHistory(patientId: string): Promise<Array<{ organizationId: string; name: string; lastVisit: string; dataAvailable: boolean }>> {
    await this.ensureValidToken();
    console.log(`[MyHealthWay] Fetching visit history for patient: ${patientId}`);

    // 시뮬레이션
    return [
      { organizationId: 'org-001', name: '서울대학교병원', lastVisit: '2024-06-15', dataAvailable: true },
      { organizationId: 'org-002', name: '삼성서울병원', lastVisit: '2024-03-20', dataAvailable: true },
      { organizationId: 'org-003', name: '세브란스병원', lastVisit: '2023-11-10', dataAvailable: true },
      { organizationId: 'org-004', name: '건강검진센터', lastVisit: '2024-06-01', dataAvailable: true },
    ];
  }

  // --------------------------------------------------------
  // 5. 기초데이터 조회 API
  // --------------------------------------------------------

  /**
   * 제공기관 목록 조회
   */
  async getProviderList(): Promise<Array<{ id: string; name: string; type: string; fhirCapabilities: MyHealthWayResourceType[] }>> {
    console.log(`[MyHealthWay] Fetching provider list...`);

    // 시뮬레이션
    return [
      { id: 'org-001', name: '서울대학교병원', type: '상급종합병원', fhirCapabilities: ['Patient', 'Condition', 'MedicationRequest', 'Observation', 'DiagnosticReport', 'Procedure'] },
      { id: 'org-002', name: '삼성서울병원', type: '상급종합병원', fhirCapabilities: ['Patient', 'Condition', 'MedicationRequest', 'Observation', 'ImagingStudy', 'DiagnosticReport'] },
      { id: 'org-003', name: '세브란스병원', type: '상급종합병원', fhirCapabilities: ['Patient', 'Condition', 'MedicationRequest', 'Observation', 'AllergyIntolerance'] },
      { id: 'org-004', name: '건강검진센터', type: '검진기관', fhirCapabilities: ['Patient', 'Observation', 'DiagnosticReport'] },
    ];
  }

  /**
   * 플랫폼 약관 조회
   */
  async getTermsOfService(): Promise<{ version: string; content: string; updatedAt: string }> {
    return {
      version: '2.1',
      content: '건강정보 고속도로 이용약관 (테스트베드 버전)',
      updatedAt: '2024-01-01T00:00:00Z',
    };
  }

  // --------------------------------------------------------
  // 6. 연동 상태 관리
  // --------------------------------------------------------

  /** 현재 연동 상태 확인 */
  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    patientId: string | null;
    tokenExpiresAt: string | null;
    config: { baseUrl: string; fhirVersion: string };
  } {
    return {
      connected: !!this.accessToken,
      authenticated: !!this.accessToken && (!this.tokenExpiresAt || this.tokenExpiresAt > new Date()),
      patientId: this.patientId,
      tokenExpiresAt: this.tokenExpiresAt?.toISOString() || null,
      config: { baseUrl: this.config.baseUrl, fhirVersion: this.config.fhirVersion },
    };
  }

  /** 연결 해제 */
  disconnect(): void {
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.refreshToken = null;
    this.patientId = null;
    console.log('[MyHealthWay] Disconnected');
  }

  // --------------------------------------------------------
  // 시뮬레이션 데이터 생성 (테스트베드 연동 전 개발/테스트용)
  // --------------------------------------------------------

  private generateSimulatedBundle(resourceType: MyHealthWayResourceType, params: Record<string, string>): FHIRBundle {
    const resources = this.getSimulatedResources(resourceType);
    return {
      resourceType: 'Bundle',
      id: `bundle-${this.generateRandomString(8)}`,
      type: 'searchset',
      total: resources.length,
      link: [
        { relation: 'self', url: `${this.config.fhirBaseUrl}/${resourceType}` },
      ],
      entry: resources.map(resource => ({
        fullUrl: `${this.config.fhirBaseUrl}/${resource.resourceType}/${resource.id}`,
        resource,
        search: { mode: 'match' },
      })),
    };
  }

  private getSimulatedResources(resourceType: MyHealthWayResourceType): FHIRResource[] {
    switch (resourceType) {
      case 'Patient':
        return [{
          resourceType: 'Patient',
          id: 'testbed-patient-001',
          meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-patient'] },
          identifier: [{ system: 'urn:oid:1.2.410.100110.10.1', value: '800315-1******' }],
          name: [{ family: '김', given: ['건강'], text: '김건강' }],
          gender: 'male',
          birthDate: '1985-03-15',
          telecom: [{ system: 'phone', value: '010-1234-5678' }],
          address: [{ text: '서울특별시 강남구', city: '서울특별시', district: '강남구' }],
        }];

      case 'Condition':
        return [
          {
            resourceType: 'Condition',
            id: 'condition-001',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-condition'] },
            clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }] }],
            code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9', display: '상세불명의 합병증을 동반하지 않은 2형 당뇨병' }], text: '2형 당뇨병' },
            subject: { reference: 'Patient/testbed-patient-001' },
            onsetDateTime: '2023-06-15',
            recordedDate: '2023-06-15',
          },
          {
            resourceType: 'Condition',
            id: 'condition-002',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-condition'] },
            clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
            code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'I10', display: '본태성(원발성) 고혈압' }], text: '고혈압' },
            subject: { reference: 'Patient/testbed-patient-001' },
            onsetDateTime: '2022-03-20',
            recordedDate: '2022-03-20',
          },
          {
            resourceType: 'Condition',
            id: 'condition-003',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-condition'] },
            clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
            code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E78.5', display: '상세불명의 고지혈증' }], text: '이상지질혈증' },
            subject: { reference: 'Patient/testbed-patient-001' },
            onsetDateTime: '2023-06-15',
            recordedDate: '2023-06-15',
          },
        ];

      case 'MedicationRequest':
        return [
          {
            resourceType: 'MedicationRequest',
            id: 'medrq-001',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-medicationrequest'] },
            status: 'active',
            intent: 'order',
            medicationCodeableConcept: { coding: [{ system: 'http://www.whocc.no/atc', code: 'C09AA05', display: 'Ramipril' }], text: '라미프릴 5mg' },
            subject: { reference: 'Patient/testbed-patient-001' },
            authoredOn: '2024-06-15',
            dosageInstruction: [{ text: '1일 1회, 아침 식후 복용', timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } }, doseAndRate: [{ doseQuantity: { value: 5, unit: 'mg' } }] }],
          },
          {
            resourceType: 'MedicationRequest',
            id: 'medrq-002',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-medicationrequest'] },
            status: 'active',
            intent: 'order',
            medicationCodeableConcept: { coding: [{ system: 'http://www.whocc.no/atc', code: 'A10BA02', display: 'Metformin' }], text: '메트포르민 500mg' },
            subject: { reference: 'Patient/testbed-patient-001' },
            authoredOn: '2024-06-15',
            dosageInstruction: [{ text: '1일 2회, 아침/저녁 식후 복용', timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd' } }, doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }] }],
          },
          {
            resourceType: 'MedicationRequest',
            id: 'medrq-003',
            status: 'active',
            intent: 'order',
            medicationCodeableConcept: { coding: [{ system: 'http://www.whocc.no/atc', code: 'C10AA05', display: 'Atorvastatin' }], text: '아토르바스타틴 20mg' },
            subject: { reference: 'Patient/testbed-patient-001' },
            authoredOn: '2024-06-15',
            dosageInstruction: [{ text: '1일 1회, 저녁 식후 복용', timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } }, doseAndRate: [{ doseQuantity: { value: 20, unit: 'mg' } }] }],
          },
        ];

      case 'Observation':
        return [
          {
            resourceType: 'Observation',
            id: 'obs-lab-001',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-observation-laboratory'] },
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
            code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c' }], text: '당화혈색소(HbA1c)' },
            subject: { reference: 'Patient/testbed-patient-001' },
            effectiveDateTime: '2024-06-15',
            valueQuantity: { value: 6.8, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
            referenceRange: [{ low: { value: 4.0, unit: '%' }, high: { value: 5.6, unit: '%' }, text: '4.0 - 5.6 %' }],
            interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'H', display: 'High' }] }],
          },
          {
            resourceType: 'Observation',
            id: 'obs-lab-002',
            meta: { profile: ['http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-observation-laboratory'] },
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
            code: { coding: [{ system: 'http://loinc.org', code: '2093-3', display: 'Total Cholesterol' }], text: '총콜레스테롤' },
            subject: { reference: 'Patient/testbed-patient-001' },
            effectiveDateTime: '2024-06-15',
            valueQuantity: { value: 245, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
            referenceRange: [{ high: { value: 200, unit: 'mg/dL' }, text: '< 200 mg/dL' }],
            interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'H', display: 'High' }] }],
          },
          {
            resourceType: 'Observation',
            id: 'obs-lab-003',
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
            code: { coding: [{ system: 'http://loinc.org', code: '2085-9', display: 'HDL Cholesterol' }], text: 'HDL 콜레스테롤' },
            subject: { reference: 'Patient/testbed-patient-001' },
            effectiveDateTime: '2024-06-15',
            valueQuantity: { value: 38, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
            referenceRange: [{ low: { value: 40, unit: 'mg/dL' }, text: '> 40 mg/dL' }],
            interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'L', display: 'Low' }] }],
          },
          {
            resourceType: 'Observation',
            id: 'obs-vital-001',
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
            code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }], text: '혈압' },
            subject: { reference: 'Patient/testbed-patient-001' },
            effectiveDateTime: '2024-06-15',
            component: [
              { code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: 142, unit: 'mmHg' } },
              { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: 92, unit: 'mmHg' } },
            ],
          },
        ];

      case 'DiagnosticReport':
        return [{
          resourceType: 'DiagnosticReport',
          id: 'diagrpt-001',
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB', display: 'Laboratory' }] }],
          code: { coding: [{ system: 'http://loinc.org', code: '58410-2', display: 'Complete blood count' }], text: '일반혈액검사' },
          subject: { reference: 'Patient/testbed-patient-001' },
          effectiveDateTime: '2024-06-15',
          issued: '2024-06-15T14:30:00+09:00',
          result: [
            { reference: 'Observation/obs-lab-001' },
            { reference: 'Observation/obs-lab-002' },
            { reference: 'Observation/obs-lab-003' },
          ],
          conclusion: '당화혈색소 상승, 총콜레스테롤 상승, HDL 감소 소견. 대사증후군 관리 필요.',
        }];

      case 'Procedure':
        return [{
          resourceType: 'Procedure',
          id: 'proc-001',
          status: 'completed',
          code: { coding: [{ system: 'http://snomed.info/sct', code: '73761001', display: 'Colonoscopy' }], text: '대장내시경' },
          subject: { reference: 'Patient/testbed-patient-001' },
          performedDateTime: '2024-03-20',
          note: [{ text: '특이소견 없음. 3년 후 재검 권고.' }],
        }];

      case 'AllergyIntolerance':
        return [{
          resourceType: 'AllergyIntolerance',
          id: 'allergy-001',
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
          type: 'allergy',
          category: ['medication'],
          code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'J01CA04', display: 'Amoxicillin' }], text: '아목시실린' },
          patient: { reference: 'Patient/testbed-patient-001' },
          recordedDate: '2020-05-10',
          reaction: [{ manifestation: [{ coding: [{ display: '두드러기' }] }], severity: 'moderate' }],
        }];

      default:
        return [];
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// 싱글톤 인스턴스
export const myhealthwayConnector = new MyHealthWayConnector();
