import { useEffect, useState } from 'react';
import { Shield, ShieldCheck, ShieldX, Plus } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function ConsentView() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newConsent, setNewConsent] = useState({ category: '', purpose: '' });

  useEffect(() => {
    api.getConsents().then(data => {
      setConsents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGrant = async () => {
    if (!newConsent.category || !newConsent.purpose) return;
    try {
      const consent = await api.grantConsent({
        ...newConsent,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setConsents(prev => [...prev, consent]);
      setShowAdd(false);
      setNewConsent({ category: '', purpose: '' });
    } catch (e) {
      alert('동의 등록에 실패했습니다.');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('이 동의를 철회하시겠습니까? 철회 후 해당 데이터에 대한 접근이 차단됩니다.')) return;
    try {
      const updated = await api.revokeConsent(id);
      setConsents(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) {
      alert('동의 철회에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  const activeConsents = consents.filter(c => c.status === 'active');
  const revokedConsents = consents.filter(c => c.status === 'revoked');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">동의 관리</h1>
          <p className="text-gray-500 mt-1">데이터 수집 및 활용에 대한 동의를 관리합니다.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          동의 추가
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <Shield className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <p className="text-2xl font-bold">{consents.length}</p>
          <p className="text-sm text-gray-500">전체 동의</p>
        </div>
        <div className="card text-center">
          <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold">{activeConsents.length}</p>
          <p className="text-sm text-gray-500">활성 동의</p>
        </div>
        <div className="card text-center">
          <ShieldX className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold">{revokedConsents.length}</p>
          <p className="text-sm text-gray-500">철회된 동의</p>
        </div>
      </div>

      {/* Add Consent Modal */}
      {showAdd && (
        <div className="card border-primary-200">
          <h3 className="font-semibold mb-4">새 동의 등록</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">데이터 카테고리</label>
              <select
                value={newConsent.category}
                onChange={(e) => setNewConsent(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">선택하세요</option>
                <option value="건강검진">건강검진</option>
                <option value="웨어러블">웨어러블</option>
                <option value="생활습관">생활습관</option>
                <option value="진료기록">진료기록</option>
                <option value="투약이력">투약이력</option>
                <option value="유전체">유전체</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">활용 목적</label>
              <input
                type="text"
                value={newConsent.purpose}
                onChange={(e) => setNewConsent(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="예: 검진 결과 분석 및 건강 코칭"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleGrant} className="btn-primary text-sm">동의 등록</button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Consents */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-green-700">활성 동의 항목</h2>
        {activeConsents.length === 0 ? (
          <p className="text-gray-500 text-sm">활성 동의 항목이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {activeConsents.map(consent => (
              <div key={consent.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{consent.category}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{consent.purpose}</p>
                  <p className="text-xs text-gray-400 mt-1">동의일: {new Date(consent.grantedAt).toLocaleDateString('ko-KR')}</p>
                </div>
                <button
                  onClick={() => handleRevoke(consent.id)}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  철회
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked Consents */}
      {revokedConsents.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-red-700">철회된 동의 항목</h2>
          <div className="space-y-3">
            {revokedConsents.map(consent => (
              <div key={consent.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg opacity-75">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldX className="w-4 h-4 text-red-600" />
                    <span className="font-medium line-through">{consent.category}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{consent.purpose}</p>
                  <p className="text-xs text-gray-400 mt-1">철회일: {consent.revokedAt ? new Date(consent.revokedAt).toLocaleDateString('ko-KR') : '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="font-medium text-gray-700 mb-2">개인정보 처리 안내</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 동의는 언제든지 철회할 수 있으며, 철회 시 해당 데이터에 대한 접근이 즉시 차단됩니다.</li>
          <li>• 수집된 데이터는 명시된 목적으로만 활용되며, 목적 달성 후 안전하게 삭제됩니다.</li>
          <li>• 모든 데이터 접근 기록은 감사로그에 기록되며, '접근 로그' 메뉴에서 확인할 수 있습니다.</li>
          <li>• 민감정보는 AES-256 암호화로 보호되며, 전송 시 TLS 1.2 이상을 사용합니다.</li>
        </ul>
      </div>
    </div>
  );
}
