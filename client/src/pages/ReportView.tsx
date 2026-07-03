import { useEffect, useState } from 'react';
import { FileText, Download, Plus, Clock } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function ReportView() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReports().then(data => {
      setReports(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const report = await api.generateReport();
      setReports(prev => [...prev, report]);
      setSelectedReport(report);
    } catch (e: any) {
      alert(e.message || '리포트 생성에 실패했습니다.');
    }
    setGenerating(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">병원 제출용 리포트</h1>
          <p className="text-gray-500 mt-1">의료진에게 보여줄 건강 요약 리포트를 생성합니다.</p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              생성 중...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              새 리포트 생성
            </>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Report List */}
        <div className="w-80 space-y-2">
          {reports.length === 0 ? (
            <div className="card text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">생성된 리포트가 없습니다.</p>
            </div>
          ) : (
            reports.map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedReport?.id === report.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <span className="font-medium text-sm truncate">{report.title}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(report.generatedAt).toLocaleString('ko-KR')}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Report Detail */}
        <div className="flex-1">
          {selectedReport ? (
            <div className="card">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                  <p className="text-sm text-gray-500">생성일: {new Date(selectedReport.generatedAt).toLocaleString('ko-KR')}</p>
                </div>
                <button className="btn-secondary flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  PDF 다운로드
                </button>
              </div>

              <div className="space-y-6">
                {selectedReport.sections.map((section: any, idx: number) => (
                  <div key={idx} className="border-b border-gray-50 pb-4 last:border-0">
                    <h3 className="font-semibold text-gray-900 mb-2">{section.title}</h3>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{section.content}</div>

                    {section.observations && section.observations.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">항목</th>
                              <th className="text-right py-2 px-2">측정값</th>
                              <th className="text-right py-2 px-2">참조범위</th>
                              <th className="text-center py-2 px-2">판정</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.observations.map((obs: any) => (
                              <tr key={obs.id} className="border-b border-gray-50">
                                <td className="py-2 px-2">{obs.display}</td>
                                <td className="py-2 px-2 text-right font-mono">{obs.value} {obs.unit}</td>
                                <td className="py-2 px-2 text-right text-gray-500">
                                  {obs.referenceRange ? `${obs.referenceRange.low}~${obs.referenceRange.high}` : '-'}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                                    obs.status === 'normal' ? 'bg-green-100 text-green-800' :
                                    obs.status === 'caution' ? 'bg-yellow-100 text-yellow-800' :
                                    obs.status === 'warning' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {obs.status === 'normal' ? '정상' : obs.status === 'caution' ? '주의' : obs.status === 'warning' ? '경고' : '위험'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">리포트를 선택하세요</h3>
              <p className="text-gray-500">왼쪽 목록에서 리포트를 선택하거나 새로 생성하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
