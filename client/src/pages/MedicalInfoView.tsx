import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, MapPin, Pill, AlertTriangle, TrendingUp, Users, Download, Activity } from 'lucide-react';

const extApi = {
  searchHospitals: (q?: string, dept?: string) => fetch(`/api/ext/hospitals?query=${q || ''}&department=${dept || ''}`).then(r => r.json()),
  searchPharmacies: () => fetch('/api/ext/pharmacies').then(r => r.json()),
  searchMedications: (q: string) => fetch(`/api/ext/medications/search?query=${q}`).then(r => r.json()),
  checkInteractions: (meds: string[]) => fetch('/api/ext/medications/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ medications: meds }) }).then(r => r.json()),
  getRecommendations: () => fetch('/api/ext/hospital-recommendations').then(r => r.json()),
  getTimeline: () => fetch('/api/ext/timeline').then(r => r.json()),
  getChronicPrograms: () => fetch('/api/ext/chronic-programs').then(r => r.json()),
  getFamily: () => fetch('/api/ext/family').then(r => r.json()),
  inviteFamily: (data: any) => fetch('/api/ext/family/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  exportFhir: () => fetch('/api/ext/export/fhir').then(r => r.json()),
  exportCsv: () => fetch('/api/ext/export/csv').then(r => r.text()),
};

export default function MedicalInfoView() {
  const [tab, setTab] = useState<'search' | 'interactions' | 'timeline' | 'programs' | 'family' | 'export'>('search');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [family, setFamily] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [medQuery, setMedQuery] = useState('');
  const [myMeds, setMyMeds] = useState<string[]>(['메트포르민', '라미프릴', '아토르바스타틴']);

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    const [rec, tl, prog, fam] = await Promise.all([
      extApi.getRecommendations(), extApi.getTimeline(), extApi.getChronicPrograms(), extApi.getFamily()
    ]);
    setRecommendations(rec); setTimeline(tl); setPrograms(prog.programs || []); setFamily(fam);
  };

  const handleSearchHospital = async () => { const r = await extApi.searchHospitals(searchQuery); setHospitals(r.hospitals); };
  const handleSearchMed = async () => { const r = await extApi.searchMedications(medQuery); setMedications(r.medications); };
  const handleCheckInteractions = async () => { const r = await extApi.checkInteractions(myMeds); setInteractions(r); };
  const handleExportFhir = async () => { const data = await extApi.exportFhir(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); downloadBlob(blob, 'myhealth-fhir-bundle.json'); };
  const handleExportCsv = async () => { const data = await extApi.exportCsv(); const blob = new Blob([data], { type: 'text/csv' }); downloadBlob(blob, 'myhealth-data.csv'); };
  const downloadBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };

  const tabs = [
    { id: 'search', icon: Search, label: '병원/의약품' },
    { id: 'interactions', icon: Pill, label: '약물 상호작용' },
    { id: 'timeline', icon: TrendingUp, label: '건강 타임라인' },
    { id: 'programs', icon: Activity, label: '만성질환 프로그램' },
    { id: 'family', icon: Users, label: '가족/보호자' },
    { id: 'export', icon: Download, label: '데이터 내보내기' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">의료 정보 서비스</h1>
        <p className="text-gray-500 mt-1">병원 검색, 약물 상호작용, 건강 타임라인, 만성질환 프로그램을 이용하세요.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* 병원/의약품 검색 */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-3">병원 검색</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="병원명 또는 진료과 검색" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleSearchHospital} className="btn-primary text-sm"><Search className="w-4 h-4" /></button>
            </div>
            {hospitals.length > 0 && (
              <div className="space-y-2">{hospitals.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div><p className="font-medium text-sm">{h.name}</p><p className="text-xs text-gray-500"><MapPin className="w-3 h-3 inline" /> {h.address} ({h.distance}km)</p></div>
                  <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">{h.department}</span>
                </div>
              ))}</div>
            )}
          </div>
          {/* 이상소견 기반 병원 추천 */}
          {recommendations?.recommendations?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> 검진 결과 기반 진료 추천</h2>
              <div className="space-y-2">{recommendations.recommendations.slice(0, 5).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border border-orange-100 bg-orange-50 rounded-lg">
                  <div><p className="font-medium text-sm">{r.item}: {r.value}</p><p className="text-xs text-gray-600">추천 진료과: {r.departments.join(', ')}</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded ${r.urgency === '즉시 방문' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.urgency}</span>
                </div>
              ))}</div>
            </div>
          )}
          <div className="card">
            <h2 className="font-semibold mb-3">의약품 검색</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={medQuery} onChange={e => setMedQuery(e.target.value)} placeholder="약품명 또는 성분명" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleSearchMed} className="btn-primary text-sm"><Search className="w-4 h-4" /></button>
            </div>
            {medications.length > 0 && (
              <div className="space-y-2">{medications.map((m: any) => (
                <div key={m.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.ingredient} | {m.manufacturer} | {m.dosage}</p>
                </div>
              ))}</div>
            )}
          </div>
        </div>
      )}

      {/* 약물 상호작용 */}
      {tab === 'interactions' && (
        <div className="card">
          <h2 className="font-semibold mb-4">약물 상호작용 체크</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">현재 복용 중인 약물:</p>
            <div className="flex flex-wrap gap-2">{myMeds.map(m => (
              <span key={m} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
                {m} <button onClick={() => setMyMeds(prev => prev.filter(x => x !== m))} className="text-blue-500 hover:text-blue-700">×</button>
              </span>
            ))}</div>
          </div>
          <button onClick={handleCheckInteractions} className="btn-primary text-sm mb-4">상호작용 확인</button>
          {interactions && (
            <div className="space-y-2">{interactions.interactions.map((i: any, idx: number) => (
              <div key={idx} className={`p-3 rounded-lg border ${i.severity === 'moderate' ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.severity === 'moderate' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'}`}>{i.severity === 'moderate' ? '주의' : '참고'}</span>
                  <span className="font-medium text-sm">{i.drug1} + {i.drug2}</span>
                </div>
                <p className="text-sm text-gray-700">{i.description}</p>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* 건강 타임라인 */}
      {tab === 'timeline' && timeline && (
        <div className="card">
          <h2 className="font-semibold mb-4">건강 수치 변화 추이</h2>
          {timeline.trends && Object.keys(timeline.trends).filter(k => timeline.trends[k].length > 1).map(code => (
            <div key={code} className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{code}</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={timeline.trends[code]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(0, 7)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={{ r: 4 }} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
          {(!timeline.trends || Object.keys(timeline.trends).every(k => timeline.trends[k].length <= 1)) && (
            <p className="text-gray-500 text-center py-8">여러 해의 검진 데이터를 가져오면 변화 추이를 확인할 수 있습니다.</p>
          )}
        </div>
      )}

      {/* 만성질환 프로그램 */}
      {tab === 'programs' && (
        <div className="space-y-4">{programs.map((p: any) => (
          <div key={p.id} className={`card ${p.recommended ? 'border-primary-200 bg-primary-50/30' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{p.name}</h3>
              {p.recommended && <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">추천</span>}
            </div>
            <p className="text-sm text-gray-600 mb-3">{p.description}</p>
            <div className="flex flex-wrap gap-1 mb-3">{p.modules.map((m: string) => <span key={m} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{m}</span>)}</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">기간: {p.duration}</span>
              <button className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700">프로그램 시작</button>
            </div>
          </div>
        ))}</div>
      )}

      {/* 가족/보호자 */}
      {tab === 'family' && (
        <div className="card">
          <h2 className="font-semibold mb-4">가족/보호자 관리</h2>
          <div className="space-y-3 mb-4">{family.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div><p className="font-medium text-sm">{f.name}</p><p className="text-xs text-gray-500">{f.relationship === 'parent' ? '부모님' : f.relationship} | {f.status === 'active' ? '연결됨' : '대기 중'}</p></div>
              <div className="flex gap-1">{f.permissions?.map((p: string) => <span key={p} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{p === 'viewDashboard' ? '대시보드' : p === 'viewCheckup' ? '검진' : '알림'}</span>)}</div>
            </div>
          ))}</div>
          <button className="btn-secondary text-sm"><Users className="w-4 h-4 inline mr-1" /> 보호자 초대</button>
        </div>
      )}

      {/* 데이터 내보내기 */}
      {tab === 'export' && (
        <div className="card">
          <h2 className="font-semibold mb-4">데이터 내보내기</h2>
          <p className="text-sm text-gray-600 mb-6">내 건강 데이터를 다운로드하거나 다른 플랫폼으로 이전할 수 있습니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleExportFhir} className="p-4 border-2 border-gray-200 rounded-xl text-left hover:border-primary-300 transition-colors">
              <Download className="w-6 h-6 text-primary-600 mb-2" />
              <p className="font-semibold">FHIR Bundle (JSON)</p>
              <p className="text-xs text-gray-500 mt-1">HL7 FHIR R4 표준 형식. 다른 의료 시스템으로 이전 가능.</p>
            </button>
            <button onClick={handleExportCsv} className="p-4 border-2 border-gray-200 rounded-xl text-left hover:border-primary-300 transition-colors">
              <Download className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-semibold">CSV (Excel)</p>
              <p className="text-xs text-gray-500 mt-1">스프레드시트 형식. Excel, Google Sheets에서 열기 가능.</p>
            </button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            마이데이터 이동권에 따라 언제든지 내 데이터를 내보내거나 삭제할 수 있습니다.
          </div>
        </div>
      )}
    </div>
  );
}
