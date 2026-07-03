import { useEffect, useState } from 'react';
import { Link2, Unlink, RefreshCw, Building2, FileCheck, Database, Shield, ArrowRight } from 'lucide-react';
import { api } from '../hooks/useApi';

// API 확장
const mhwApi = {
  getStatus: () => fetch('/api/myhealthway/status').then(r => r.json()),
  getAuthUrl: () => fetch('/api/myhealthway/auth/authorize').then(r => r.json()),
  authenticate: (code: string) => fetch('/api/myhealthway/auth/callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).then(r => r.json()),
  disconnect: () => fetch('/api/myhealthway/auth/disconnect', { method: 'POST' }).then(r => r.json()),
  getProviders: () => fetch('/api/myhealthway/providers').then(r => r.json()),
  getVisitHistory: () => fetch('/api/myhealthway/visit-history').then(r => r.json()),
  requestConsent: (data: any) => fetch('/api/myhealthway/consent/provider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  sync: () => fetch('/api/myhealthway/sync', { method: 'POST' }).then(r => r.json()),
  searchFhir: (type: string) => fetch(`/api/myhealthway/fhir/${type}`).then(r => r.json()),
};

export default function MyHealthWayView() {
  const [status, setStatus] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [fhirData, setFhirData] = useState<any>(null);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusData, providerData] = await Promise.all([
        mhwApi.getStatus(),
        mhwApi.getProviders(),
      ]);
      setStatus(statusData);
      setProviders(providerData);
    } catch (e) {}
    setLoading(false);
  };

  const handleConnect = async () => {
    setAuthenticating(true);
    try {
      // 시뮬레이션: 실제로는 authorizationUrl로 리다이렉트 후 콜백에서 처리
      const authData = await mhwApi.getAuthUrl();
      // 테스트베드에서는 바로 시뮬레이션 인증 수행
      const result = await mhwApi.authenticate('simulated-auth-code-testbed');
      if (result.success) {
        const history = await mhwApi.getVisitHistory();
        setVisitHistory(history);
        await loadData();
      }
    } catch (e) {}
    setAuthenticating(false);
  };

  const handleDisconnect = async () => {
    await mhwApi.disconnect();
    setVisitHistory([]);
    setSyncResult(null);
    setFhirData(null);
    await loadData();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await mhwApi.sync();
      setSyncResult(result);
    } catch (e) {}
    setSyncing(false);
  };

  const handleSearchFhir = async (resourceType: string) => {
    setSelectedResource(resourceType);
    try {
      const data = await mhwApi.searchFhir(resourceType);
      setFhirData(data);
    } catch (e) {}
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">건강정보 고속도로 연동</h1>
        <p className="text-gray-500 mt-1">정부 건강정보 고속도로(MyHealthWay) 테스트베드와 FHIR 기반으로 연동합니다.</p>
      </div>

      {/* Connection Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            연동 상태
          </h2>
          {status?.connected ? (
            <button onClick={handleDisconnect} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
              <Unlink className="w-4 h-4" /> 연결 해제
            </button>
          ) : (
            <button onClick={handleConnect} disabled={authenticating} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              {authenticating ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> 인증 중...</>
              ) : (
                <><Link2 className="w-4 h-4" /> 연동 시작</>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg border ${status?.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs text-gray-500">연결 상태</p>
            <p className={`font-semibold ${status?.connected ? 'text-green-700' : 'text-gray-500'}`}>
              {status?.connected ? '연결됨' : '미연결'}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
            <p className="text-xs text-gray-500">FHIR 버전</p>
            <p className="font-semibold">{status?.config?.fhirVersion || 'R4'}</p>
          </div>
          <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
            <p className="text-xs text-gray-500">지원 리소스</p>
            <p className="font-semibold">{status?.testbedInfo?.supportedResources?.length || 12}개</p>
          </div>
          <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
            <p className="text-xs text-gray-500">플랫폼</p>
            <p className="font-semibold text-xs">건강정보 고속도로</p>
          </div>
        </div>

        {status?.connected && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p className="font-medium">SMART on FHIR 인증 완료</p>
            <p className="text-xs mt-1">Patient ID: {status.patientId} | 토큰 만료: {status.tokenExpiresAt ? new Date(status.tokenExpiresAt).toLocaleString('ko-KR') : '-'}</p>
          </div>
        )}
      </div>

      {/* SMART on FHIR Auth Flow Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          SMART on FHIR 인증 흐름
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['본인인증\n(카카오/네이버)', '데이터 동의\n(제공동의)', 'OAuth2\n코드 발급', '토큰 교환\n(Access Token)', 'FHIR API\n데이터 조회'].map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className={`px-3 py-2 rounded-lg text-xs text-center whitespace-pre-line ${
                status?.connected && i <= 4 ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <span className="font-medium">{i + 1}단계</span><br/>{step}
              </div>
              {i < 4 && <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Provider List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          제공기관 목록
        </h2>
        <div className="space-y-2">
          {providers.map((provider: any) => (
            <div key={provider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{provider.name}</p>
                <p className="text-xs text-gray-500">{provider.type} | FHIR 리소스: {provider.fhirCapabilities.length}개</p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {provider.fhirCapabilities.slice(0, 3).map((cap: string) => (
                  <span key={cap} className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">{cap}</span>
                ))}
                {provider.fhirCapabilities.length > 3 && (
                  <span className="text-xs text-gray-400">+{provider.fhirCapabilities.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Sync */}
      {status?.connected && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              데이터 동기화
            </h2>
            <button onClick={handleSync} disabled={syncing} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              {syncing ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> 동기화 중...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> 동기화 실행</>
              )}
            </button>
          </div>

          {syncResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-2">동기화 완료</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">총 리소스:</span> <span className="font-medium">{syncResult.totalResources}건</span></div>
                <div><span className="text-gray-500">검사 결과:</span> <span className="font-medium">{syncResult.newObservations}건</span></div>
                <div><span className="text-gray-500">진단 내역:</span> <span className="font-medium">{syncResult.newConditions}건</span></div>
                <div><span className="text-gray-500">처방 내역:</span> <span className="font-medium">{syncResult.newMedications}건</span></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">동기화 시각: {new Date(syncResult.syncedAt).toLocaleString('ko-KR')}</p>
            </div>
          )}
        </div>
      )}

      {/* FHIR Resource Browser */}
      {status?.connected && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            FHIR 리소스 조회
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Patient', 'Condition', 'MedicationRequest', 'Observation', 'DiagnosticReport', 'Procedure', 'AllergyIntolerance'].map(type => (
              <button
                key={type}
                onClick={() => handleSearchFhir(type)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedResource === type ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {fhirData && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium">Bundle ({fhirData.type}) - {fhirData.total || 0}건</span>
                <span className="text-xs text-gray-500">FHIR R4</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {JSON.stringify(fhirData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Technical Info */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="font-medium text-gray-700 mb-3">기술 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-600 mb-1">표준 규격</p>
            <ul className="text-gray-500 space-y-0.5">
              <li>• HL7 FHIR R4 (4.0.1)</li>
              <li>• KR Core Implementation Guide v2.0</li>
              <li>• SMART on FHIR (OAuth 2.0)</li>
              <li>• 건강정보 고속도로 API 규격</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-600 mb-1">참고 링크</p>
            <ul className="text-gray-500 space-y-0.5">
              <li>• <a href="https://www.myhealthway.go.kr" target="_blank" className="text-primary-600 hover:underline">건강정보 고속도로 포털</a></li>
              <li>• <a href="https://www.myhealthway.go.kr:8443/portal/" target="_blank" className="text-primary-600 hover:underline">테스트베드 포털</a></li>
              <li>• <a href="https://www.hl7korea.or.kr/fhir/krcore/" target="_blank" className="text-primary-600 hover:underline">KR Core IG</a></li>
              <li>• <a href="https://build.fhir.org/ig/HL7/smart-app-launch/" target="_blank" className="text-primary-600 hover:underline">SMART App Launch</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
