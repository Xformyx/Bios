import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Smartphone, Wifi, WifiOff, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function WearableView() {
  const [data, setData] = useState<any[]>([]);
  const [connections, setConnections] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getWearableData(14),
      api.getWearableConnections(),
      api.getWearableTrends(),
    ]).then(([wData, conn, trd]) => {
      setData(wData);
      setConnections(conn);
      setTrends(trd);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'worsening') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">웨어러블 데이터</h1>
        <p className="text-gray-500 mt-1">연결된 기기에서 수집된 활동, 수면, 심박 데이터입니다.</p>
      </div>

      {/* Connections */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          연결된 기기
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connections?.connections?.map((conn: any) => (
            <div key={conn.source} className={`p-4 rounded-lg border ${conn.connected ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{conn.name}</span>
                {conn.connected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
              </div>
              <p className="text-xs text-gray-500">
                {conn.connected ? `마지막 동기화: ${new Date(conn.lastSync).toLocaleString('ko-KR')}` : '연결되지 않음'}
              </p>
              {conn.connected && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {conn.dataTypes.map((dt: string) => (
                    <span key={dt} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{dt}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trends Summary */}
      {trends?.trends && trends.trends.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">트렌드 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trends.trends.map((t: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{t.metric}</span>
                  {trendIcon(t.trend)}
                </div>
                <p className="text-2xl font-bold">{t.avgValue.toLocaleString()} <span className="text-sm font-normal text-gray-500">{t.unit}</span></p>
                <p className="text-xs text-gray-400 mt-1">
                  {t.trend === 'improving' ? '개선 추세' : t.trend === 'worsening' ? '하락 추세' : '안정적'}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">분석 기간: {trends.period} ({trends.dataPoints}일)</p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steps Chart */}
        <div className="card">
          <h3 className="font-semibold mb-4">걸음 수</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="steps" stroke="#3b82f6" fill="#dbeafe" name="걸음 수" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sleep Chart */}
        <div className="card">
          <h3 className="font-semibold mb-4">수면 시간</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 10]} />
              <Tooltip />
              <Area type="monotone" dataKey="sleepHours" stroke="#8b5cf6" fill="#ede9fe" name="수면(시간)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Heart Rate Chart */}
        <div className="card">
          <h3 className="font-semibold mb-4">심박수</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} domain={[50, 120]} />
              <Tooltip />
              <Line type="monotone" dataKey="heartRateAvg" stroke="#ef4444" name="평균 심박수" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="heartRateMin" stroke="#86efac" name="최저" strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="heartRateMax" stroke="#fca5a5" name="최고" strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Active Minutes Chart */}
        <div className="card">
          <h3 className="font-semibold mb-4">활동 시간</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="activeMinutes" stroke="#10b981" fill="#d1fae5" name="활동(분)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
