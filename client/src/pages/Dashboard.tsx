import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle, TrendingUp, Activity, Moon, Heart as HeartIcon, Target } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSummary().then(data => {
      setSummary(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!summary) {
    return <div className="text-center py-12 text-gray-500">데이터를 불러올 수 없습니다.</div>;
  }

  const statusColors: Record<string, string> = {
    normal: 'bg-green-100 text-green-800 border-green-200',
    caution: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    warning: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">건강 대시보드</h1>
        <p className="text-gray-500 mt-1">마지막 검진일: {summary.lastCheckupDate || '없음'}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">오늘 걸음 수</p>
            <p className="text-xl font-bold">{summary.latestMetrics?.steps?.toLocaleString() || '-'}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Moon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">수면 시간</p>
            <p className="text-xl font-bold">{summary.latestMetrics?.sleepHours?.toFixed(1) || '-'}시간</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <HeartIcon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">평균 심박수</p>
            <p className="text-xl font-bold">{summary.latestMetrics?.heartRateAvg || '-'} bpm</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">목표 진행률</p>
            <p className="text-xl font-bold">{summary.activeGoal?.progress?.toFixed(0) || 0}%</p>
          </div>
        </div>
      </div>

      {/* Risk Signals */}
      {summary.riskSignals && summary.riskSignals.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            건강 위험 신호
          </h2>
          <div className="space-y-2">
            {summary.riskSignals.slice(0, 5).map((signal: any, idx: number) => (
              <div key={idx} className={`px-4 py-3 rounded-lg border ${statusColors[signal.level]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{signal.message}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">{signal.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Scores & Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Health Status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">카테고리별 건강 상태</h2>
          <div className="space-y-3">
            {Object.entries(summary.categoryScores || {}).map(([category, data]: [string, any]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{data.abnormal}/{data.total} 항목 이상</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[data.status]}`}>
                    {data.status === 'normal' ? '정상' : data.status === 'caution' ? '주의' : '경고'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            주간 활동량
          </h2>
          {summary.weeklyActivity && summary.weeklyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="steps" fill="#3b82f6" radius={[4, 4, 0, 0]} name="걸음 수" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">활동 데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* Active Goal Progress */}
      {summary.activeGoal && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">{summary.activeGoal.title || '90일 건강 목표'}</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${summary.activeGoal.progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-600">{summary.activeGoal.progress.toFixed(0)}%</span>
          </div>
          <p className="text-sm text-gray-500">현재 {summary.activeGoal.currentWeek}주차 진행 중</p>
        </div>
      )}
    </div>
  );
}
