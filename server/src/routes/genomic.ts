import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { dtcGenomicService, DTCProvider } from '../services/dtcGenomic.js';

export const genomicRouter = Router();
genomicRouter.use(authenticateToken);

// ============================================================
// 연동 상태 및 설정
// ============================================================

/** DTC 연동 상태 조회 */
genomicRouter.get('/connections', (req: AuthRequest, res: Response) => {
  const connections = dtcGenomicService.getConnectionConfig(req.userId!);
  res.json({ connections });
});

/** DTC 제공자 연동 */
genomicRouter.post('/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, apiKey, apiSecret, userId } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'provider와 apiKey는 필수입니다.' });
    }
    const result = await dtcGenomicService.connectProvider(req.userId!, provider as DTCProvider, { apiKey, apiSecret, userId });
    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'DTC-Genomic', details: `${provider} 연동 완료` });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** DTC 제공자 연동 해제 */
genomicRouter.post('/disconnect', (req: AuthRequest, res: Response) => {
  const { provider } = req.body;
  dtcGenomicService.disconnectProvider(req.userId!, provider as DTCProvider);
  store.addAuditLog({ userId: req.userId!, action: 'DELETE', resource: 'DTC-Genomic', details: `${provider} 연동 해제` });
  res.json({ success: true });
});

// ============================================================
// 유전체 결과 조회
// ============================================================

/** 유전체 결과 가져오기 (API 호출) */
genomicRouter.post('/fetch', async (req: AuthRequest, res: Response) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ error: 'provider를 지정해주세요.' });

    const report = await dtcGenomicService.fetchResults(req.userId!, provider as DTCProvider);
    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'DTC-Report', details: `${provider} 유전체 결과 조회 (${report.summary.totalItems}항목)` });
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 저장된 유전체 결과 조회 */
genomicRouter.get('/report', (req: AuthRequest, res: Response) => {
  const report = dtcGenomicService.getReport(req.userId!);
  if (!report) {
    return res.json({ hasReport: false, message: 'DTC 유전체 검사 결과가 없습니다. 마크로젠 또는 제노플랜을 연동해주세요.' });
  }
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'DTC-Report', details: '유전체 결과 조회' });
  res.json({ hasReport: true, report });
});

/** 카테고리별 결과 조회 */
genomicRouter.get('/report/category/:categoryId', (req: AuthRequest, res: Response) => {
  const report = dtcGenomicService.getReport(req.userId!);
  if (!report) return res.status(404).json({ error: '유전체 결과가 없습니다.' });

  const category = report.categories.find(c => c.id === req.params.categoryId);
  if (!category) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });

  res.json(category);
});

// ============================================================
// 교차 분석 (검진 + 유전체)
// ============================================================

/** 검진 수치와 유전체 교차 분석 */
genomicRouter.get('/cross-analysis', (req: AuthRequest, res: Response) => {
  const checkups = store.healthCheckups.get(req.userId!) || [];
  const latest = checkups[checkups.length - 1];

  if (!latest) {
    return res.json({ insights: [], message: '검진 데이터가 없습니다.' });
  }

  const insights = dtcGenomicService.getCrossAnalysis(req.userId!, latest.observations);
  res.json({ insights, basedOn: latest.checkupDate });
});

/** AI 코치용 유전체 컨텍스트 */
genomicRouter.get('/ai-context', (req: AuthRequest, res: Response) => {
  const context = dtcGenomicService.getGenomicContextForAI(req.userId!);
  res.json({ hasGenomicData: !!context, context });
});
