import { useEffect, useState } from 'react';
import { Dna, Link2, Unlink, AlertTriangle, TrendingUp, Shield, ArrowUpRight } from 'lucide-react';

const genomicApi = {
  getConnections: () => fetch('/api/genomic/connections').then(r => r.json()),
  connect: (data: any) => fetch('/api/genomic/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  disconnect: (provider: string) => fetch('/api/genomic/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) }).then(r => r.json()),
  fetchResults: (provider: string) => fetch('/api/genomic/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) }).then(r => r.json()),
  getReport: () => fetch('/api/genomic/report').then(r => r.json()),
  getCrossAnalysis: () => fetch('/api/genomic/cross-analysis').then(r => r.json()),
};

export default function GenomicView() {
  const [connections, setConnections] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [crossAnalysis, setCrossAnalysis] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('macrogen');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [conn, rep, cross] = await Promise.all([
      genomicApi.getConnections(), genomicApi.getReport(), genomicApi.getCrossAnalysis().catch(() => null),
    ]);
    setConnections(conn.connections || []);
    if (rep.hasReport) setReport(rep.report);
    if (cross) setCrossAnalysis(cross);
  };

  const handleConnect = async () => {
    setConnecting(true);
    await genomicApi.connect({ provider: selectedProvider, apiKey: apiKey || 'demo-key', userId: 'demo-user' });
    setApiKey('');
    await loadData();
    setConnecting(false);
  };

  const handleFetch = async (provider: string) => {
    setFetching(true);
    await genomicApi.fetchResults(provider);
    await loadData();
    setFetching(false);
  };

  const riskColors: Record<string, string> = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    average: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  };
  const riskLabels: Record<string, string> = { high: '높음', average: '보통', low: '낮음' };
  const riskBarColors: Record<string, string> = { high: 'bg-red-500', average: 'bg-yellow-500', low: 'bg-green-500' };

  const activeCategory = report?.categories?.find((c: any) => c.id === selectedCategory);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Dna className="w-6 h-6 text-purple-600" /> 유전체 데이터
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">마크로젠/제노플랜 DTC 유전자검사 결과를 조회하고 건강 관리에 활용합니다.</p>
      </div>

      {/* 연동 상태 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">DTC 제공자 연동</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[
            { id: 'macrogen', name: '마크로젠 (젠톡)', items: 218, markers: '4,807', desc: '국내 최대 DTC 검사 항목' },
            { id: 'genoplan', name: '제노플랜코리아', items: 206, markers: '65,106', desc: '딥러닝 기반 PRS 분석' },
          ].map(p => {
            const conn = connections.find((c: any) => c.provider === p.id);
            return (
              <div key={p.id} className={`p-4 rounded-xl border-2 transition-all ${conn?.connected ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold dark:text-gray-100">{p.name}</span>
                  {conn?.connected ? (
                    <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs">연결됨</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">미연결</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.desc}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{p.items}개 항목 | {p.markers}개 마커</p>
                {conn?.connected && (
                  <button onClick={() => handleFetch(p.id)} disabled={fetching} className="mt-3 w-full btn-primary text-xs py-1.5 disabled:opacity-50">
                    {fetching ? '조회 중...' : '결과 가져오기'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 연동 폼 */}
        {!connections.some((c: any) => c.connected) && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-medium text-sm mb-3 dark:text-gray-200">DTC 서비스 연동</h3>
            <div className="flex gap-2 mb-3">
              <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="input w-40">
                <option value="macrogen">마크로젠</option>
                <option value="genoplan">제노플랜</option>
              </select>
              <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key (제공자에서 발급)" className="input flex-1" />
              <button onClick={handleConnect} disabled={connecting} className="btn-primary text-sm whitespace-nowrap disabled:opacity-50">
                <Link2 className="w-4 h-4 inline mr-1" />{connecting ? '연동 중...' : '연동'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">마크로젠 젠톡 또는 제노플랜에서 검사를 받은 후, 해당 서비스에서 API Key를 발급받아 입력하세요.</p>
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      {report && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold dark:text-gray-100">검사 결과 요약</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {report.provider === 'macrogen' ? '마크로젠' : '제노플랜'} | 검사일: {report.reportDate}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{report.summary.highRiskCount}</p>
                <p className="text-xs text-red-700 dark:text-red-300">높음</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{report.summary.averageRiskCount}</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">보통</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{report.summary.lowRiskCount}</p>
                <p className="text-xs text-green-700 dark:text-green-300">낮음</p>
              </div>
            </div>

            {/* 주요 고위험 항목 */}
            {report.summary.topRiskItems.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-sm mb-2 flex items-center gap-1 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" /> 주요 고위험 항목
                </h3>
                <div className="space-y-2">
                  {report.summary.topRiskItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                      <div>
                        <p className="font-medium text-sm dark:text-gray-100">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">상위 {item.percentile}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 카테고리별 결과 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">카테고리별 결과</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {report.categories.map((cat: any) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedCategory === cat.id ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {cat.name} ({cat.items.length})
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="space-y-2 animate-fadeIn">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{activeCategory.description}</p>
                {activeCategory.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm dark:text-gray-100">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description} | {item.markers}개 마커</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.percentile && <span className="text-xs text-gray-400">상위 {item.percentile}%</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${riskColors[item.riskLevel]}`}>
                        {riskLabels[item.riskLevel]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!activeCategory && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">카테고리를 선택하면 상세 결과를 확인할 수 있습니다.</p>
            )}
          </div>

          {/* 교차 분석 */}
          {crossAnalysis?.insights?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                <TrendingUp className="w-5 h-5 text-purple-600" /> 검진 + 유전체 교차 분석
              </h2>
              <div className="space-y-3">
                {crossAnalysis.insights.map((insight: any, i: number) => (
                  <div key={i} className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                        {insight.checkupItem} + {insight.geneticItem}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{insight.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 안내 */}
          <div className="card bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" /> 유전체 검사 결과 안내
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• DTC 유전자검사 결과는 유전적 경향을 나타내며, 실제 질병 발생을 확정하지 않습니다.</li>
              <li>• 생활습관, 환경, 식이 등 후천적 요인이 실제 건강에 더 큰 영향을 줄 수 있습니다.</li>
              <li>• 유전적 고위험이라도 적극적인 생활습관 관리로 위험을 크게 낮출 수 있습니다.</li>
              <li>• AI 코치는 유전체 결과를 참고하여 개인화된 건강 조언을 제공합니다.</li>
              <li>• 질병 진단이나 치료 결정은 반드시 의료진과 상담하세요.</li>
            </ul>
          </div>
        </>
      )}

      {/* 결과 없음 */}
      {!report && (
        <div className="card text-center py-12">
          <Dna className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">유전체 검사 결과가 없습니다</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">마크로젠(젠톡) 또는 제노플랜에서 DTC 유전자검사를 받은 후, 위에서 연동하면 결과를 확인할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
