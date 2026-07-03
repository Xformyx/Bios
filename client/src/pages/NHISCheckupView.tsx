import { useEffect, useState } from 'react';
import { ShieldCheck, Download, FileSearch, Building, CheckCircle, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';

const identityApi = {
  requestVerify: (data: any) => fetch('/api/identity/verify/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  completeVerify: (data: any) => fetch('/api/identity/verify/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getCheckupHistory: (verificationId: string) => fetch(`/api/identity/nhis/checkups?verificationId=${verificationId}`).then(r => r.json()),
  getCheckupDetail: (verificationId: string, year: number) => fetch(`/api/identity/nhis/checkups/${year}?verificationId=${verificationId}`).then(r => r.json()),
  importCheckup: (data: any) => fetch('/api/identity/nhis/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
};

type Step = 'verify' | 'history' | 'detail';

export default function NHISCheckupView() {
  const [step, setStep] = useState<Step>('verify');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [history, setHistory] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [verifyForm, setVerifyForm] = useState({ provider: 'kakao', name: '', birthDate: '', phone: '', gender: 'male' });

  const handleVerify = async () => {
    if (!verifyForm.name || !verifyForm.birthDate) {
      alert('이름과 생년월일을 입력해주세요.');
      return;
    }
    setVerifying(true);
    try {
      // 1. 인증 요청
      const request = await identityApi.requestVerify(verifyForm);
      // 2. 시뮬레이션: 바로 완료 처리 (실제로는 팝업 인증 후 콜백)
      const result = await identityApi.completeVerify({
        requestId: request.requestId,
        ...verifyForm,
      });
      if (result.success) {
        setVerificationId(result.verification.verificationId);
        // 3. 검진 이력 조회
        const hist = await identityApi.getCheckupHistory(result.verification.verificationId);
        setHistory(hist);
        setStep('history');
      }
    } catch (e) {
      alert('본인인증에 실패했습니다.');
    }
    setVerifying(false);
  };

  const handleViewDetail = async (year: number) => {
    if (!verificationId) return;
    setSelectedYear(year);
    const data = await identityApi.getCheckupDetail(verificationId, year);
    setDetail(data);
    setStep('detail');
  };

  const handleImport = async () => {
    if (!verificationId || !selectedYear) return;
    setImporting(true);
    try {
      const result = await identityApi.importCheckup({ verificationId, year: selectedYear });
      setImportResult(result);
    } catch (e) {
      alert('데이터 가져오기에 실패했습니다.');
    }
    setImporting(false);
  };

  const statusStyles: Record<string, string> = {
    normal: 'bg-green-100 text-green-800',
    caution: 'bg-yellow-100 text-yellow-800',
    warning: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  const statusLabels: Record<string, string> = { normal: '정상', caution: '주의', warning: '경고', critical: '위험' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">건강검진 데이터 가져오기</h1>
        <p className="text-gray-500 mt-1">본인인증 후 건강보험공단에서 건강검진 결과를 조회하고 가져옵니다.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'verify', label: '본인인증' },
          { id: 'history', label: '검진 이력 조회' },
          { id: 'detail', label: '결과 확인 및 가져오기' },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              step === s.id ? 'bg-primary-100 text-primary-800 font-medium' :
              ['verify', 'history', 'detail'].indexOf(step) > i ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {s.label}
            </div>
            {i < 2 && <ArrowRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: 본인인증 */}
      {step === 'verify' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            본인인증
          </h2>
          <p className="text-sm text-gray-600 mb-6">건강검진 데이터를 조회하려면 본인인증이 필요합니다. 인증 수단을 선택하고 정보를 입력해주세요.</p>

          {/* 인증 수단 선택 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { id: 'kakao', name: '카카오', icon: '💬', color: 'border-yellow-300 bg-yellow-50' },
              { id: 'naver', name: '네이버', icon: '🟢', color: 'border-green-300 bg-green-50' },
              { id: 'pass', name: 'PASS', icon: '📱', color: 'border-blue-300 bg-blue-50' },
              { id: 'certificate', name: '공동인증서', icon: '🔐', color: 'border-purple-300 bg-purple-50' },
            ].map(p => (
              <button key={p.id} onClick={() => setVerifyForm(prev => ({ ...prev, provider: p.id as any }))}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  verifyForm.provider === p.id ? p.color + ' shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <span className="text-2xl">{p.icon}</span>
                <p className="text-sm font-medium mt-1">{p.name}</p>
              </button>
            ))}
          </div>

          {/* 인증 정보 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input type="text" value={verifyForm.name} onChange={(e) => setVerifyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="홍길동" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생년월일 (8자리) *</label>
              <input type="text" value={verifyForm.birthDate} onChange={(e) => setVerifyForm(prev => ({ ...prev, birthDate: e.target.value }))}
                placeholder="19850315" maxLength={8} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
              <input type="text" value={verifyForm.phone} onChange={(e) => setVerifyForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="01012345678" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
              <select value={verifyForm.gender} onChange={(e) => setVerifyForm(prev => ({ ...prev, gender: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
          </div>

          <button onClick={handleVerify} disabled={verifying} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {verifying ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> 인증 중...</>
            ) : (
              <><Smartphone className="w-4 h-4" /> 본인인증 시작</>
            )}
          </button>
        </div>
      )}

      {/* Step 2: 검진 이력 */}
      {step === 'history' && history && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">본인인증 완료 - 건강검진 이력</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">총 {history.totalCount}건의 건강검진 이력이 확인되었습니다. 조회할 검진을 선택하세요.</p>

          <div className="space-y-2">
            {history.checkups.map((checkup: any) => (
              <div key={checkup.year} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-700">{checkup.year.toString().slice(2)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{checkup.type}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building className="w-3 h-3" /> {checkup.institution} | {checkup.date}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleViewDetail(checkup.year)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center gap-1">
                  <FileSearch className="w-4 h-4" /> 조회
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: 검진 상세 결과 */}
      {step === 'detail' && detail && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedYear}년 건강검진 결과</h2>
                <p className="text-sm text-gray-500">{detail.institution} | {detail.checkupDate} | {detail.checkupType}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('history')} className="btn-secondary text-sm">목록으로</button>
                <button onClick={handleImport} disabled={importing || !!importResult} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                  {importing ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> 가져오는 중...</>
                  ) : importResult ? (
                    <><CheckCircle className="w-4 h-4" /> 가져오기 완료</>
                  ) : (
                    <><Download className="w-4 h-4" /> 내 데이터로 가져오기</>
                  )}
                </button>
              </div>
            </div>

            {importResult && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                {importResult.message} ({importResult.itemCount}개 항목)
              </div>
            )}

            {/* 종합소견 */}
            {detail.opinion && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="font-medium text-blue-800 mb-1">종합소견</p>
                <p className="text-sm text-blue-700">{detail.opinion}</p>
                {detail.followUp && <p className="text-sm text-blue-600 mt-1">{detail.followUp}</p>}
              </div>
            )}

            {/* 검사 결과 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">카테고리</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">검사 항목</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">측정값</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">참조 범위</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">판정</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.results.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">{item.category}</td>
                      <td className="py-3 px-4 font-medium">{item.itemName}</td>
                      <td className="py-3 px-4 text-right font-mono">{item.value} {item.unit}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{item.referenceRange || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[item.status]}`}>
                          {statusLabels[item.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="font-medium text-gray-700 mb-2">안내사항</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 본인인증은 24시간 동안 유효하며, 이후 재인증이 필요합니다.</li>
          <li>• 건강검진 데이터는 건강보험공단에서 제공하며, 최근 5년간 이력을 조회할 수 있습니다.</li>
          <li>• 가져온 데이터는 대시보드와 AI 코치에서 활용됩니다.</li>
          <li>• 모든 데이터 조회 기록은 접근 로그에 기록됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
