import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { myhealthwayConnector, MyHealthWayResourceType } from '../services/myhealthway.js';

export const myhealthwayRouter = Router();
myhealthwayRouter.use(authenticateToken);

// ============================================================
// 연동 상태 조회
// ============================================================

myhealthwayRouter.get('/status', (req: AuthRequest, res: Response) => {
  const status = myhealthwayConnector.getConnectionStatus();
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'MyHealthWay', details: '연동 상태 조회' });
  res.json({
    ...status,
    description: '건강정보 고속도로 테스트베드 연동 상태',
    testbedInfo: {
      portal: 'https://www.myhealthway.go.kr:8443/portal/',
      documentation: 'https://www.myhealthway.go.kr/portal/index?page=Individual/Portal/MediMyData/MydataApi',
      supportedResources: [
        'Patient', 'Organization', 'Practitioner', 'PractitionerRole',
        'Condition', 'MedicationRequest', 'Observation', 'ImagingStudy',
        'DiagnosticReport', 'Procedure', 'AllergyIntolerance', 'DocumentReference',
      ],
    },
  });
});

// ============================================================
// SMART on FHIR 인증 흐름
// ============================================================

/** 인증 URL 생성 (사용자를 건강정보 고속도로 인증 페이지로 리다이렉트) */
myhealthwayRouter.get('/auth/authorize', (req: AuthRequest, res: Response) => {
  const scopes = (req.query.scopes as string)?.split(',') || ['patient/*.read', 'openid', 'fhirUser'];
  const { url, state } = myhealthwayConnector.generateAuthorizationUrl(scopes);

  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'MyHealthWay', details: 'SMART on FHIR 인증 시작' });

  res.json({
    authorizationUrl: url,
    state,
    instructions: [
      '1. authorizationUrl로 사용자를 리다이렉트합니다.',
      '2. 사용자가 본인인증(네이버/카카오) 후 동의를 완료합니다.',
      '3. 콜백 URL로 authorization code가 전달됩니다.',
      '4. /api/myhealthway/auth/callback에 code를 전달하여 토큰을 교환합니다.',
    ],
    note: '테스트베드 환경에서는 시뮬레이션된 인증이 수행됩니다.',
  });
});

/** OAuth2 콜백 - Authorization Code를 Token으로 교환 */
myhealthwayRouter.post('/auth/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code가 필요합니다.' });
    }

    const tokenResponse = await myhealthwayConnector.exchangeCodeForToken(code);

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'MyHealthWay', details: 'SMART on FHIR 토큰 교환 완료' });

    res.json({
      success: true,
      message: '건강정보 고속도로 인증이 완료되었습니다.',
      patientId: tokenResponse.patient,
      scope: tokenResponse.scope,
      expiresIn: tokenResponse.expires_in,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '인증 처리 중 오류가 발생했습니다.' });
  }
});

/** 연결 해제 */
myhealthwayRouter.post('/auth/disconnect', (req: AuthRequest, res: Response) => {
  myhealthwayConnector.disconnect();
  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'MyHealthWay', details: '연동 해제' });
  res.json({ success: true, message: '건강정보 고속도로 연동이 해제되었습니다.' });
});

// ============================================================
// 동적동의 API
// ============================================================

/** 제공동의 요청 */
myhealthwayRouter.post('/consent/provider', async (req: AuthRequest, res: Response) => {
  try {
    const { providerId, dataCategories, purpose, period } = req.body;

    const consentResponse = await myhealthwayConnector.requestProviderConsent({
      patientId: req.userId!,
      providerId,
      dataCategories: dataCategories || ['Patient', 'Condition', 'Observation', 'MedicationRequest'],
      purpose: purpose || '건강관리 서비스 제공',
      period: period || { start: new Date().toISOString(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
    });

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'MyHealthWay-Consent', details: `제공동의: ${providerId}` });
    res.json(consentResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 활용동의 요청 */
myhealthwayRouter.post('/consent/service', async (req: AuthRequest, res: Response) => {
  try {
    const { dataCategories, purpose } = req.body;

    const consentResponse = await myhealthwayConnector.requestServiceConsent(
      req.userId!,
      dataCategories || ['Patient', 'Condition', 'Observation', 'MedicationRequest', 'DiagnosticReport'],
      purpose || '건강 데이터 분석 및 코칭',
    );

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'MyHealthWay-Consent', details: '활용동의 완료' });
    res.json(consentResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 데이터 조회 API (FHIR RESTful)
// ============================================================

/** FHIR 리소스 검색 */
myhealthwayRouter.get('/fhir/:resourceType', async (req: AuthRequest, res: Response) => {
  try {
    const resourceType = req.params.resourceType as MyHealthWayResourceType;
    const params = req.query as Record<string, string>;

    const bundle = await myhealthwayConnector.searchResource(resourceType, params);

    store.addAuditLog({ userId: req.userId!, action: 'READ', resource: `MyHealthWay-${resourceType}`, details: `FHIR 검색: ${resourceType}` });
    res.json(bundle);
  } catch (error: any) {
    res.status(error.message.includes('인증') ? 401 : 500).json({ error: error.message });
  }
});

/** 환자 전체 데이터 조회 ($everything) */
myhealthwayRouter.get('/fhir/Patient/:patientId/$everything', async (req: AuthRequest, res: Response) => {
  try {
    const bundle = await myhealthwayConnector.getPatientEverything(req.params.patientId);

    store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'MyHealthWay-Everything', details: '전체 의료데이터 조회' });
    res.json(bundle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 의료기관 방문기록 및 기초데이터
// ============================================================

/** 의료기관 방문기록 조회 */
myhealthwayRouter.get('/visit-history', async (req: AuthRequest, res: Response) => {
  try {
    const history = await myhealthwayConnector.getVisitHistory(req.userId!);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 제공기관 목록 조회 */
myhealthwayRouter.get('/providers', async (req: AuthRequest, res: Response) => {
  try {
    const providers = await myhealthwayConnector.getProviderList();
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 플랫폼 약관 조회 */
myhealthwayRouter.get('/terms', async (req: AuthRequest, res: Response) => {
  try {
    const terms = await myhealthwayConnector.getTermsOfService();
    res.json(terms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 데이터 동기화 (건강정보 고속도로 → 내부 저장소)
// ============================================================

/** 건강정보 고속도로 데이터를 내부 저장소로 동기화 */
myhealthwayRouter.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    // 시뮬레이션: 건강정보 고속도로에서 데이터를 가져와 내부 형식으로 변환
    const bundle = await myhealthwayConnector.getPatientEverything('testbed-patient-001');

    const syncResult = {
      syncedAt: new Date().toISOString(),
      totalResources: bundle.total,
      resourcesByType: {} as Record<string, number>,
      newObservations: 0,
      newConditions: 0,
      newMedications: 0,
    };

    if (bundle.entry) {
      for (const entry of bundle.entry) {
        const type = entry.resource.resourceType;
        syncResult.resourcesByType[type] = (syncResult.resourcesByType[type] || 0) + 1;
      }

      // Observation을 내부 검진 데이터로 변환
      const observations = bundle.entry
        .filter(e => e.resource.resourceType === 'Observation')
        .map(e => e.resource);

      if (observations.length > 0) {
        syncResult.newObservations = observations.length;
        // 내부 저장소에 FHIR Observation → 내부 ObservationData 변환 저장
        // (실제 구현에서는 여기서 FHIR normalizer를 통해 변환)
      }

      syncResult.newConditions = bundle.entry.filter(e => e.resource.resourceType === 'Condition').length;
      syncResult.newMedications = bundle.entry.filter(e => e.resource.resourceType === 'MedicationRequest').length;
    }

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'MyHealthWay-Sync', details: `동기화 완료: ${bundle.total}건` });

    res.json({
      success: true,
      message: '건강정보 고속도로 데이터 동기화가 완료되었습니다.',
      ...syncResult,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
