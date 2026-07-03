import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { identityService, nhisCheckupService } from '../services/identityVerification.js';

export const identityRouter = Router();
identityRouter.use(authenticateToken);

// ============================================================
// 본인인증
// ============================================================

/** 본인인증 요청 (인증 팝업 URL 반환) */
identityRouter.post('/verify/request', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, name, birthDate, phone, gender } = req.body;

    if (!provider || !name || !birthDate) {
      return res.status(400).json({ error: '인증 제공자, 이름, 생년월일은 필수입니다.' });
    }

    const result = await identityService.requestVerification({
      provider,
      name,
      birthDate,
      phone,
      gender: gender || 'male',
    });

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Identity', details: `본인인증 요청: ${provider}` });

    res.json({
      ...result,
      message: '본인인증 팝업을 열어주세요. 인증 완료 후 콜백이 호출됩니다.',
      provider,
      instructions: {
        pass: 'PASS 앱에서 인증 요청을 확인하세요.',
        kakao: '카카오톡에서 인증 요청을 확인하세요.',
        naver: '네이버 앱에서 인증 요청을 확인하세요.',
        certificate: '공동인증서를 선택하여 인증하세요.',
      }[provider],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 본인인증 완료 콜백 (시뮬레이션: 바로 성공 처리) */
identityRouter.post('/verify/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { requestId, provider, name, birthDate, phone, gender } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'requestId가 필요합니다.' });
    }

    const result = await identityService.completeVerification(requestId, {
      provider: provider || 'kakao',
      name: name || '김건강',
      birthDate: birthDate || '19850315',
      phone: phone || '01012345678',
      gender: gender || 'male',
    });

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Identity', details: `본인인증 완료: ${result.provider}` });

    res.json({
      success: true,
      verification: result,
      message: '본인인증이 완료되었습니다. 이제 건강검진 데이터를 조회할 수 있습니다.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 본인인증 상태 확인 */
identityRouter.get('/verify/status/:verificationId', (req: AuthRequest, res: Response) => {
  const verification = identityService.getVerification(req.params.verificationId);
  if (!verification) {
    return res.json({ verified: false, message: '인증 정보가 없습니다.' });
  }
  const valid = identityService.isVerificationValid(req.params.verificationId);
  res.json({ ...verification, valid });
});

// ============================================================
// 건강보험공단 건강검진 조회
// ============================================================

/** 건강검진 이력 조회 (본인인증 필요) */
identityRouter.get('/nhis/checkups', async (req: AuthRequest, res: Response) => {
  try {
    const { verificationId } = req.query;

    if (!verificationId) {
      return res.status(400).json({ error: '본인인증이 필요합니다. 먼저 본인인증을 완료해주세요.', requireVerification: true });
    }

    const verification = identityService.getVerification(verificationId as string);
    if (!verification || !identityService.isVerificationValid(verificationId as string)) {
      return res.status(401).json({ error: '본인인증이 만료되었습니다. 다시 인증해주세요.', requireVerification: true });
    }

    const history = await nhisCheckupService.getCheckupHistory(verification.ci!);

    store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'NHIS-Checkup', details: `검진 이력 조회: ${history.totalCount}건` });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 특정 연도 건강검진 상세 결과 조회 */
identityRouter.get('/nhis/checkups/:year', async (req: AuthRequest, res: Response) => {
  try {
    const { verificationId } = req.query;
    const year = parseInt(req.params.year, 10);

    if (!verificationId) {
      return res.status(400).json({ error: '본인인증이 필요합니다.', requireVerification: true });
    }

    const verification = identityService.getVerification(verificationId as string);
    if (!verification || !identityService.isVerificationValid(verificationId as string)) {
      return res.status(401).json({ error: '본인인증이 만료되었습니다.', requireVerification: true });
    }

    const detail = await nhisCheckupService.getCheckupDetail(verification.ci!, year);

    store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'NHIS-Checkup', details: `${year}년 검진 상세 조회` });

    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 건강검진 데이터를 내부 저장소로 가져오기 (Import) */
identityRouter.post('/nhis/import', async (req: AuthRequest, res: Response) => {
  try {
    const { verificationId, year } = req.body;

    if (!verificationId || !year) {
      return res.status(400).json({ error: 'verificationId와 year가 필요합니다.' });
    }

    const verification = identityService.getVerification(verificationId);
    if (!verification || !identityService.isVerificationValid(verificationId)) {
      return res.status(401).json({ error: '본인인증이 만료되었습니다.', requireVerification: true });
    }

    // 검진 데이터 조회
    const detail = await nhisCheckupService.getCheckupDetail(verification.ci!, year);

    // 내부 저장소에 변환하여 저장
    const observations = detail.results.map(item => ({
      id: crypto.randomUUID(),
      code: item.itemCode,
      display: item.itemName,
      value: typeof item.value === 'number' ? item.value : parseFloat(item.value as string) || 0,
      unit: item.unit,
      status: item.status,
      referenceRange: item.referenceRange ? parseReferenceRange(item.referenceRange) : undefined,
      category: item.category,
    }));

    const checkup = {
      id: crypto.randomUUID(),
      userId: req.userId!,
      checkupDate: detail.checkupDate,
      source: 'api' as const,
      observations,
      createdAt: new Date().toISOString(),
    };

    const checkups = store.healthCheckups.get(req.userId!) || [];
    checkups.push(checkup);
    store.healthCheckups.set(req.userId!, checkups);

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'NHIS-Import', details: `${year}년 검진 데이터 가져오기 완료 (${observations.length}항목)` });

    res.json({
      success: true,
      message: `${year}년 건강검진 데이터를 성공적으로 가져왔습니다.`,
      checkupId: checkup.id,
      itemCount: observations.length,
      checkupDate: detail.checkupDate,
      institution: detail.institution,
      opinion: detail.opinion,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 참조범위 파싱 헬퍼
function parseReferenceRange(rangeStr: string): { low?: number; high?: number } {
  const result: { low?: number; high?: number } = {};
  const match1 = rangeStr.match(/(\d+\.?\d*)\s*~\s*(\d+\.?\d*)/);
  if (match1) {
    result.low = parseFloat(match1[1]);
    result.high = parseFloat(match1[2]);
  }
  const match2 = rangeStr.match(/<\s*(\d+\.?\d*)/);
  if (match2) {
    result.low = 0;
    result.high = parseFloat(match2[1]);
  }
  const match3 = rangeStr.match(/>\s*(\d+\.?\d*)/);
  if (match3) {
    result.low = parseFloat(match3[1]);
  }
  return result;
}
