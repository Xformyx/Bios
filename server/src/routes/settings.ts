import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { llmProvider } from '../services/llmProvider.js';

export const settingsRouter = Router();
settingsRouter.use(authenticateToken);

// ============================================================
// 프로필 설정
// ============================================================

settingsRouter.get('/profile', (req: AuthRequest, res: Response) => {
  const user = store.users.get(req.userId!);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  const { passwordHash, ...profile } = user;
  res.json(profile);
});

settingsRouter.patch('/profile', (req: AuthRequest, res: Response) => {
  const user = store.users.get(req.userId!);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

  const { name, birthDate, gender } = req.body;
  if (name) user.name = name;
  if (birthDate) user.birthDate = birthDate;
  if (gender) user.gender = gender;

  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'Profile', details: '프로필 수정' });
  const { passwordHash, ...profile } = user;
  res.json(profile);
});

// ============================================================
// LLM 제공자 설정
// ============================================================

/** 현재 LLM 설정 조회 */
settingsRouter.get('/llm', (req: AuthRequest, res: Response) => {
  const config = llmProvider.getConfig();
  // API Key는 마스킹하여 반환
  res.json({
    ...config,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}` : undefined,
    apiKeySet: !!config.apiKey,
  });
});

/** LLM 설정 변경 */
settingsRouter.put('/llm', (req: AuthRequest, res: Response) => {
  const { provider, model, apiKey, baseUrl, temperature, maxTokens } = req.body;

  const updated = llmProvider.updateConfig({
    provider,
    model,
    apiKey: apiKey || undefined,
    baseUrl: baseUrl || undefined,
    temperature,
    maxTokens,
  });

  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'LLM-Settings', details: `LLM 변경: ${provider} / ${model}` });

  res.json({
    ...updated,
    apiKey: updated.apiKey ? `${updated.apiKey.slice(0, 8)}...${updated.apiKey.slice(-4)}` : undefined,
    apiKeySet: !!updated.apiKey,
  });
});

/** LLM 연결 테스트 */
settingsRouter.post('/llm/test', async (req: AuthRequest, res: Response) => {
  try {
    const startTime = Date.now();
    const response = await llmProvider.chatCompletion([
      { role: 'system', content: 'You are a helpful assistant. Reply in Korean.' },
      { role: 'user', content: '안녕하세요. 테스트 메시지입니다. 간단히 인사해주세요.' },
    ]);
    const elapsed = Date.now() - startTime;

    res.json({
      success: true,
      response: response.slice(0, 200),
      latencyMs: elapsed,
      provider: llmProvider.getConfig().provider,
      model: llmProvider.getConfig().model,
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message,
      provider: llmProvider.getConfig().provider,
      model: llmProvider.getConfig().model,
    });
  }
});

// ============================================================
// Ollama 관리
// ============================================================

/** Ollama 서버 상태 확인 */
settingsRouter.get('/ollama/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await llmProvider.ollamaHealthCheck();
    res.json(status);
  } catch (error: any) {
    res.json({ running: false, error: error.message, url: llmProvider.getOllamaBaseUrl() });
  }
});

/** Ollama 서버 URL 변경 */
settingsRouter.put('/ollama/url', (req: AuthRequest, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL을 입력해주세요.' });
  llmProvider.setOllamaBaseUrl(url);
  res.json({ success: true, url: llmProvider.getOllamaBaseUrl() });
});

/** 설치된 모델 목록 */
settingsRouter.get('/ollama/models', async (req: AuthRequest, res: Response) => {
  try {
    const models = await llmProvider.ollamaListModels();
    res.json({ models });
  } catch (error: any) {
    res.status(503).json({ error: error.message, models: [] });
  }
});

/** 추천 모델 목록 */
settingsRouter.get('/ollama/recommended', (req: AuthRequest, res: Response) => {
  res.json({ models: llmProvider.getRecommendedModels() });
});

/** 모델 다운로드 */
settingsRouter.post('/ollama/pull', async (req: AuthRequest, res: Response) => {
  try {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: '모델 이름을 입력해주세요.' });

    store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Ollama-Model', details: `모델 다운로드 시작: ${model}` });

    const result = await llmProvider.ollamaPullModel(model);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** 모델 삭제 */
settingsRouter.delete('/ollama/models/:name', async (req: AuthRequest, res: Response) => {
  try {
    const modelName = decodeURIComponent(req.params.name);
    store.addAuditLog({ userId: req.userId!, action: 'DELETE', resource: 'Ollama-Model', details: `모델 삭제: ${modelName}` });

    const result = await llmProvider.ollamaDeleteModel(modelName);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** 모델 상세 정보 */
settingsRouter.get('/ollama/models/:name/info', async (req: AuthRequest, res: Response) => {
  try {
    const modelName = decodeURIComponent(req.params.name);
    const info = await llmProvider.ollamaModelInfo(modelName);
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 알림 설정
// ============================================================

settingsRouter.get('/notifications', (req: AuthRequest, res: Response) => {
  // MVP: 기본 알림 설정 반환
  res.json({
    missionReminder: true,
    riskAlert: true,
    weeklyReport: true,
    checkupReminder: true,
  });
});

settingsRouter.put('/notifications', (req: AuthRequest, res: Response) => {
  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'Notifications', details: '알림 설정 변경' });
  res.json(req.body);
});
