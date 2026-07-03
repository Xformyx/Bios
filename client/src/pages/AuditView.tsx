import { useEffect, useState } from 'react';
import { ClipboardList, Eye, Edit, PlusCircle, Clock } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function AuditView() {
  const [logs, setLogs] = useState<any>({ logs: [], total: 0, page: 1, totalPages: 1 });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      api.getAuditLogs(page),
      api.getAuditSummary(),
    ]).then(([logsData, summaryData]) => {
      setLogs(logsData);
      setSummary(summaryData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  const actionIcons: Record<string, any> = {
    READ: <Eye className="w-4 h-4 text-blue-600" />,
    CREATE: <PlusCircle className="w-4 h-4 text-green-600" />,
    UPDATE: <Edit className="w-4 h-4 text-orange-600" />,
    LOGIN: <Clock className="w-4 h-4 text-purple-600" />,
    REGISTER: <PlusCircle className="w-4 h-4 text-indigo-600" />,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">접근 로그</h1>
        <p className="text-gray-500 mt-1">데이터 조회, 생성, 수정, 다운로드 기록을 확인합니다.</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">{summary.totalActions}</p>
            <p className="text-sm text-gray-500">전체 활동</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.byAction?.READ || 0}</p>
            <p className="text-sm text-gray-500">조회</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{summary.byAction?.CREATE || 0}</p>
            <p className="text-sm text-gray-500">생성</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-orange-600">{summary.byAction?.UPDATE || 0}</p>
            <p className="text-sm text-gray-500">수정</p>
          </div>
        </div>
      )}

      {/* Log Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            활동 기록
          </h2>
          <span className="text-sm text-gray-500">총 {logs.total}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">시간</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">활동</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">대상</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">상세</th>
              </tr>
            </thead>
            <tbody>
              {logs.logs.map((log: any) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ko-KR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {actionIcons[log.action] || <Clock className="w-4 h-4 text-gray-400" />}
                      <span className="font-medium">{log.action}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{log.resource}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-500">{page} / {logs.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(logs.totalPages, p + 1))}
              disabled={page === logs.totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">보안 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 모든 데이터 접근은 불변 감사로그에 기록됩니다.</li>
          <li>• 비정상적인 접근 패턴이 감지되면 즉시 알림이 발송됩니다.</li>
          <li>• 접근 로그는 법적 보존 기간 동안 안전하게 보관됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
