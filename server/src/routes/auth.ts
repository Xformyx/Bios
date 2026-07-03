import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../utils/store.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

// 회원가입
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, birthDate, gender } = req.body;

    // 이메일 중복 확인
    for (const user of store.users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    store.users.set(userId, {
      id: userId,
      email,
      name,
      birthDate,
      gender,
      createdAt: new Date().toISOString(),
      passwordHash,
    });

    // 기본 동의 항목 생성
    store.consents.set(userId, []);

    store.addAuditLog({ userId, action: 'REGISTER', resource: 'User', details: '회원가입 완료' });

    const token = generateToken(userId);
    res.json({ token, user: { id: userId, email, name, birthDate, gender } });
  } catch (error) {
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// 로그인
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let foundUser = null;
    for (const user of store.users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 데모 계정 처리
    if (foundUser.id === 'demo-user-001') {
      const token = generateToken(foundUser.id);
      store.addAuditLog({ userId: foundUser.id, action: 'LOGIN', resource: 'Session', details: '데모 로그인' });
      return res.json({ token, user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, birthDate: foundUser.birthDate, gender: foundUser.gender } });
    }

    const isValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = generateToken(foundUser.id);
    store.addAuditLog({ userId: foundUser.id, action: 'LOGIN', resource: 'Session', details: '로그인 성공' });
    res.json({ token, user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, birthDate: foundUser.birthDate, gender: foundUser.gender } });
  } catch (error) {
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 현재 사용자 정보
authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = store.users.get(req.userId!);
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }
  const { passwordHash, ...userInfo } = user;
  res.json(userInfo);
});
