import { useState } from 'react';
import { Heart, Mail, Lock, User, Calendar } from 'lucide-react';

interface LoginPageProps {
  onLogin: (token: string, user: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('male');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any>(null);

  // OAuth 제공자 상태 확인
  useState(() => {
    fetch('/api/auth/providers').then(r => r.json()).then(setProviders).catch(() => {});
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name, birthDate, gender };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      onLogin(data.token, data.user);
    } catch (err) {
      setError('서버에 연결할 수 없습니다.');
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'kakao' | 'naver') => {
    try {
      const res = await fetch(`/api/auth/${provider}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error || `${provider} 로그인을 사용할 수 없습니다.`);
      }
    } catch {
      setError(`${provider} 로그인 연결에 실패했습니다.`);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@myhealth.kr', password: 'demo' }),
      });
      const data = await res.json();
      if (data.token) onLogin(data.token, data.user);
      else setError('데모 로그인에 실패했습니다.');
    } catch { setError('서버에 연결할 수 없습니다.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Heart className="w-10 h-10 text-primary-600" />
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">MyHealth</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Market Lite</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">개인 건강 데이터 코치</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-center mb-6 dark:text-gray-100">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름 *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="홍길동" className="input pl-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">생년월일</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="text" value={birthDate} onChange={e => setBirthDate(e.target.value)} placeholder="19850315" maxLength={8} className="input pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">성별</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="input">
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이메일 *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">비밀번호 *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="input pl-10" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 소셜 로그인 */}
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
              <div className="relative flex justify-center text-xs"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500">또는</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleOAuth('kakao')} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FEE500] hover:bg-[#FDD800] rounded-lg text-sm font-medium text-[#191919] transition-colors">
                💬 카카오
              </button>
              <button onClick={() => handleOAuth('naver')} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#03C75A] hover:bg-[#02b351] rounded-lg text-sm font-medium text-white transition-colors">
                🟢 네이버
              </button>
            </div>
          </div>

          {/* 모드 전환 */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? (
              <>계정이 없으신가요? <button onClick={() => { setMode('register'); setError(''); }} className="text-primary-600 hover:text-primary-700 font-medium">회원가입</button></>
            ) : (
              <>이미 계정이 있으신가요? <button onClick={() => { setMode('login'); setError(''); }} className="text-primary-600 hover:text-primary-700 font-medium">로그인</button></>
            )}
          </p>

          {/* 데모 로그인 */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={handleDemoLogin} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              데모 계정으로 체험하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
