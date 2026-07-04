import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../utils/store.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

// ============================================================
// 이메일/비밀번호 회원가입
// ============================================================

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, birthDate, gender } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다.' });
    }

    for (const user of store.users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    store.users.set(userId, {
      id: userId, email, name, birthDate: birthDate || '', gender: gender || 'male',
      createdAt: new Date().toISOString(), passwordHash, authProvider: 'email',
    });

    store.consents.set(userId, []);
    store.addAuditLog({ userId, action: 'REGISTER', resource: 'User', details: '회원가입 완료 (이메일)' });

    const token = generateToken(userId);
    res.json({ token, user: { id: userId, email, name, birthDate, gender } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// ============================================================
// 이메일/비밀번호 로그인
// ============================================================

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    let foundUser: any = null;
    for (const user of store.users.values()) {
      if (user.email === email) { foundUser = user; break; }
    }

    if (!foundUser) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 데모 계정
    if (foundUser.id === 'demo-user-001') {
      const token = generateToken(foundUser.id);
      store.addAuditLog({ userId: foundUser.id, action: 'LOGIN', resource: 'User', details: '데모 로그인' });
      return res.json({ token, user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, birthDate: foundUser.birthDate, gender: foundUser.gender } });
    }

    const isValid = await bcrypt.compare(password, foundUser.passwordHash || '');
    if (!isValid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    store.addAuditLog({ userId: foundUser.id, action: 'LOGIN', resource: 'User', details: '로그인 (이메일)' });
    const token = generateToken(foundUser.id);
    res.json({ token, user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, birthDate: foundUser.birthDate, gender: foundUser.gender } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// ============================================================
// 카카오 OAuth 로그인
// ============================================================

authRouter.get('/kakao', (req: Request, res: Response) => {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/kakao/callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'KAKAO_CLIENT_ID가 설정되지 않았습니다.', setup: 'https://developers.kakao.com 에서 앱을 생성하고 REST API 키를 .env에 설정하세요.' });
  }

  const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile_nickname,account_email`;
  res.json({ authUrl });
});

authRouter.get('/kakao/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: '인증 코드가 없습니다.' });

    const clientId = process.env.KAKAO_CLIENT_ID;
    const clientSecret = process.env.KAKAO_CLIENT_SECRET || '';
    const redirectUri = process.env.KAKAO_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/kakao/callback`;

    // 토큰 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId!, client_secret: clientSecret, redirect_uri: redirectUri, code: code as string }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(401).json({ error: '카카오 토큰 교환 실패', details: tokenData });

    // 사용자 정보
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const kakaoUser = await userRes.json();

    const kakaoId = kakaoUser.id?.toString();
    const nickname = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname || '사용자';
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@myhealth.local`;

    // 기존 사용자 확인 또는 생성
    let existingUser: any = null;
    for (const user of store.users.values()) {
      if ((user as any).oauthId === kakaoId && (user as any).authProvider === 'kakao') { existingUser = user; break; }
    }

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      store.users.set(userId, { id: userId, email, name: nickname, birthDate: '', gender: 'male', createdAt: new Date().toISOString(), passwordHash: '', authProvider: 'kakao', oauthId: kakaoId });
      store.consents.set(userId, []);
    }

    const token = generateToken(userId);
    res.redirect(`/?token=${token}&provider=kakao`);
  } catch (error: any) {
    res.status(500).json({ error: `카카오 로그인 실패: ${error.message}` });
  }
});

// ============================================================
// 네이버 OAuth 로그인
// ============================================================

authRouter.get('/naver', (req: Request, res: Response) => {
  const clientId = process.env.NAVER_CLIENT_ID;
  const redirectUri = process.env.NAVER_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/naver/callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'NAVER_CLIENT_ID가 설정되지 않았습니다.', setup: 'https://developers.naver.com 에서 앱을 생성하고 Client ID를 .env에 설정하세요.' });
  }

  const state = crypto.randomUUID();
  const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.json({ authUrl, state });
});

authRouter.get('/naver/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: '인증 코드가 없습니다.' });

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    // 토큰 교환
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`, { method: 'POST' });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(401).json({ error: '네이버 토큰 교환 실패' });

    // 사용자 정보
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const naverData = await userRes.json();
    const naverUser = naverData.response;

    const naverId = naverUser.id;
    const name = naverUser.name || naverUser.nickname || '사용자';
    const email = naverUser.email || `naver_${naverId}@myhealth.local`;
    const birthDate = (naverUser.birthyear && naverUser.birthday) ? naverUser.birthyear + naverUser.birthday.replace('-', '') : '';
    const gender = naverUser.gender === 'M' ? 'male' : naverUser.gender === 'F' ? 'female' : 'male';

    // 기존 사용자 확인 또는 생성
    let existingUser: any = null;
    for (const user of store.users.values()) {
      if ((user as any).oauthId === naverId && (user as any).authProvider === 'naver') { existingUser = user; break; }
    }

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      existingUser.name = name;
      if (birthDate) existingUser.birthDate = birthDate;
      existingUser.gender = gender;
    } else {
      userId = crypto.randomUUID();
      store.users.set(userId, { id: userId, email, name, birthDate, gender, createdAt: new Date().toISOString(), passwordHash: '', authProvider: 'naver', oauthId: naverId });
      store.consents.set(userId, []);
    }

    const token = generateToken(userId);
    res.redirect(`/?token=${token}&provider=naver`);
  } catch (error: any) {
    res.status(500).json({ error: `네이버 로그인 실패: ${error.message}` });
  }
});

// ============================================================
// 현재 사용자 정보 / 프로필 업데이트
// ============================================================

authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = store.users.get(req.userId!);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  const { passwordHash, ...userInfo } = user;
  res.json({ ...userInfo, authProvider: (user as any).authProvider || 'email' });
});

authRouter.patch('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = store.users.get(req.userId!);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  const { name, birthDate, gender } = req.body;
  if (name) user.name = name;
  if (birthDate) user.birthDate = birthDate;
  if (gender) user.gender = gender;
  store.addAuditLog({ userId: req.userId!, action: 'UPDATE', resource: 'User', details: '프로필 업데이트' });
  res.json({ id: user.id, email: user.email, name: user.name, birthDate: user.birthDate, gender: user.gender });
});

// ============================================================
// OAuth 설정 상태 확인
// ============================================================

authRouter.get('/providers', (req: Request, res: Response) => {
  res.json({
    email: true,
    kakao: !!process.env.KAKAO_CLIENT_ID,
    naver: !!process.env.NAVER_CLIENT_ID,
    setup: {
      kakao: process.env.KAKAO_CLIENT_ID ? '설정됨' : 'KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET을 .env에 설정하세요 (https://developers.kakao.com)',
      naver: process.env.NAVER_CLIENT_ID ? '설정됨' : 'NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 .env에 설정하세요 (https://developers.naver.com)',
    },
  });
});
