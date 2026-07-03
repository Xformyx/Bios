import { Router, Response } from 'express';
import { store } from '../utils/store.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const auditRouter = Router();
auditRouter.use(authenticateToken);

// 감사로그 조회
auditRouter.get('/', (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', action, resource } = req.query;
  let logs = store.getAuditLogs(req.userId!);

  // 필터링
  if (action) {
    logs = logs.filter(l => l.action === action);
  }
  if (resource) {
    logs = logs.filter(l => l.resource === resource);
  }

  // 최신순 정렬
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 페이지네이션
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginatedLogs = logs.slice(start, start + limitNum);

  res.json({
    logs: paginatedLogs,
    total: logs.length,
    page: pageNum,
    totalPages: Math.ceil(logs.length / limitNum),
  });
});

// 감사로그 요약
auditRouter.get('/summary', (req: AuthRequest, res: Response) => {
  const logs = store.getAuditLogs(req.userId!);

  const summary = {
    totalActions: logs.length,
    byAction: {} as Record<string, number>,
    byResource: {} as Record<string, number>,
    recentActivity: logs.slice(-5).reverse(),
  };

  for (const log of logs) {
    summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
    summary.byResource[log.resource] = (summary.byResource[log.resource] || 0) + 1;
  }

  res.json(summary);
});
