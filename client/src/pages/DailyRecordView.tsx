import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Droplets, Scale, Pill, AlertCircle, Plus, Check, Clock, Bell } from 'lucide-react';

const extApi = {
  getDailyRecords: (days = 30) => fetch(`/api/ext/daily-records?startDate=${new Date(Date.now() - days * 86400000).toISOString().split('T')[0]}`).then(r => r.json()),
  addDailyRecord: (data: any) => fetch('/api/ext/daily-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getMedSchedule: () => fetch('/api/ext/medication-schedule').then(r => r.json()),
  takeMed: (id: string, time: string) => fetch(`/api/ext/medication-schedule/${id}/take`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time }) }).then(r => r.json()),
  getSymptoms: () => fetch('/api/ext/symptoms').then(r => r.json()),
  addSymptom: (data: any) => fetch('/api/ext/symptoms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getReminders: () => fetch('/api/ext/reminders').then(r => r.json()),
};

export default function DailyRecordView() {
  const [tab, setTab] = useState<'record' | 'medication' | 'symptoms' | 'reminders'>('record');
  const [medSchedule, setMedSchedule] = useState<any>(null);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [bpSys, setBpSys] = useState(''); const [bpDia, setBpDia] = useState('');
  const [glucose, setGlucose] = useState(''); const [weight, setWeight] = useState('');
  const [newSymptoms, setNewSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [rec, med, sym, rem] = await Promise.all([
      extApi.getDailyRecords(), extApi.getMedSchedule(), extApi.getSymptoms(), extApi.getReminders()
    ]);
    setRecords(rec); setMedSchedule(med); setSymptoms(sym); setReminders(rem);
  };

  const handleAddBP = async () => {
    if (!bpSys || !bpDia) return;
    await extApi.addDailyRecord({ type: 'bloodPressure', value: { systolic: +bpSys, diastolic: +bpDia }, unit: 'mmHg' });
    setBpSys(''); setBpDia(''); loadData();
  };
  const handleAddGlucose = async () => {
    if (!glucose) return;
    await extApi.addDailyRecord({ type: 'bloodGlucose', value: +glucose, unit: 'mg/dL' });
    setGlucose(''); loadData();
  };
  const handleAddWeight = async () => {
    if (!weight) return;
    await extApi.addDailyRecord({ type: 'weight', value: +weight, unit: 'kg' });
    setWeight(''); loadData();
  };

  const symptomOptions = ['두통', '피로', '어지러움', '소화불량', '불면', '근육통', '관절통', '호흡곤란', '가슴답답', '부종'];

  const handleAddSymptom = async () => {
    if (newSymptoms.length === 0) return;
    await extApi.addSymptom({ symptoms: newSymptoms, severity, note: '' });
    setNewSymptoms([]); setSeverity(3); loadData();
  };

  const tabs = [
    { id: 'record', icon: Heart, label: '일일 기록' },
    { id: 'medication', icon: Pill, label: '복약 체크' },
    { id: 'symptoms', icon: AlertCircle, label: '증상 일지' },
    { id: 'reminders', icon: Bell, label: '알림 관리' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">일일 건강 기록</h1>
        <p className="text-gray-500 mt-1">혈압, 혈당, 체중, 복약, 증상을 매일 기록하세요.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* 일일 기록 */}
      {tab === 'record' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 혈압 */}
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> 혈압</h3>
              <div className="flex gap-2 mb-2">
                <input type="number" value={bpSys} onChange={e => setBpSys(e.target.value)} placeholder="수축기" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                <span className="self-center text-gray-400">/</span>
                <input type="number" value={bpDia} onChange={e => setBpDia(e.target.value)} placeholder="이완기" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button onClick={handleAddBP} className="w-full btn-primary text-sm py-1.5">기록</button>
            </div>
            {/* 혈당 */}
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /> 혈당</h3>
              <div className="flex gap-2 mb-2">
                <input type="number" value={glucose} onChange={e => setGlucose(e.target.value)} placeholder="mg/dL" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button onClick={handleAddGlucose} className="w-full btn-primary text-sm py-1.5">기록</button>
            </div>
            {/* 체중 */}
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Scale className="w-4 h-4 text-green-500" /> 체중</h3>
              <div className="flex gap-2 mb-2">
                <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="kg" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button onClick={handleAddWeight} className="w-full btn-primary text-sm py-1.5">기록</button>
            </div>
          </div>
          {/* 최근 기록 차트 */}
          {records.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4">최근 기록 추이</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={records.filter(r => r.bloodPressureSystolic)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="bloodPressureSystolic" stroke="#ef4444" name="수축기" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="bloodPressureDiastolic" stroke="#3b82f6" name="이완기" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 복약 체크 */}
      {tab === 'medication' && medSchedule && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">오늘의 복약 ({medSchedule.date})</h2>
          <div className="space-y-3">
            {medSchedule.schedules.map((med: any) => (
              <div key={med.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{med.name}</p>
                    <p className="text-xs text-gray-500">{med.prescribedBy}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {med.times.map((time: string) => {
                    const label = time === 'morning' ? '아침' : time === 'afternoon' ? '점심' : '저녁';
                    const taken = med.taken[time];
                    return (
                      <button key={time} onClick={() => !taken && extApi.takeMed(med.id, time).then(loadData)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${taken ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-primary-50'}`}>
                        {taken ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />} {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 증상 일지 */}
      {tab === 'symptoms' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">증상 기록</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {symptomOptions.map(s => (
                <button key={s} onClick={() => setNewSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`px-3 py-1.5 rounded-full text-sm ${newSymptoms.includes(s) ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-gray-600">심각도:</span>
              <input type="range" min="1" max="5" value={severity} onChange={e => setSeverity(+e.target.value)} className="flex-1" />
              <span className="text-sm font-medium">{severity}/5</span>
            </div>
            <button onClick={handleAddSymptom} disabled={newSymptoms.length === 0} className="btn-primary text-sm disabled:opacity-50">
              <Plus className="w-4 h-4 inline mr-1" /> 증상 기록
            </button>
          </div>
          {symptoms.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">최근 기록</h3>
              <div className="space-y-2">
                {symptoms.slice(-10).reverse().map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{s.date}</span>
                      <div className="flex gap-1">{s.symptoms?.map((sym: string) => <span key={sym} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{sym}</span>)}</div>
                    </div>
                    <span className="text-xs text-gray-400">심각도 {s.severity}/5</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 알림 관리 */}
      {tab === 'reminders' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">알림 / 리마인더</h2>
          <div className="space-y-3">
            {reminders.map((rem: any) => (
              <div key={rem.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className={`w-5 h-5 ${rem.enabled ? 'text-primary-600' : 'text-gray-300'}`} />
                  <div>
                    <p className="font-medium text-sm">{rem.title}</p>
                    <p className="text-xs text-gray-500">{rem.time} | {rem.type === 'medication' ? '복약' : rem.type === 'mission' ? '미션' : rem.type === 'checkup' ? '검진' : '기록'}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={rem.enabled} onChange={() => {}} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
