import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const consentRouter = Router();
consentRouter.use(authenticateToken);

// 동의 목록 조회
consentRouter.get('/', (req: AuthRequest, res: Response) => {
  const consents = store.consents.get(req.userId!) || [];
  store.addAuditLog({ userId: req.userId!, action: 'READ', resource: 'Consent', details: '동의 목록 조회' });
  res.json(consents);
});

// 동의 부여
consentRouter.post('/', (req: AuthRequest, res: Response) => {
  const { category, purpose, expiresAt } = req.body;
  const consent = {
    id: crypto.randomUUID(),
    userId: req.userId!,
    category,
    purpose,
    status: 'active' as const,
    grantedAt: new Date().toISOString(),
    expiresAt,
  };

  const userConsents = store.consents.get(req.userId!) || [];
  userConsents.push(consent);
  store.consents.set(req.userId!, userConsents);

  store.addAuditLog({ userId: req.userId!, action: 'CREATE', resource: 'Consent', resourceId: consent.id, details: `동의 부여: ${category}` });
  res.status(201).json(consent);
});

// 동의 철회
consentRouter.patch('/:id/revoke', (req: AuthRequest, res: Response) => {
  const userConsents = store.consents.get(req.userId!) || [];
  const consent = userConsents.find(c => c.id === req.params.id);

  if (!consent) {
    return res.status(404).json({ error: '동의 항목을 찾을 수 없습니다.' });
  }

  consent.status = 'revoked';
  consent.revokedAt = new Date().toISOString();

  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'Consent', resourceId: consent.id, details: `동의 철회: ${consent.category}` });
  res.json(consent);
});

// 전체 동의 상태 요약
consentRouter.get('/summary', (req: AuthRequest, res: Response) => {
  const consents = store.consents.get(req.userId!) || [];
  const summary = {
    total: consents.length,
    active: consents.filter(c => c.status === 'active').length,
    revoked: consents.filter(c => c.status === 'revoked').length,
    categories: [...new Set(consents.map(c => c.category))],
  };
  res.json(summary);
});
