import { useEffect, useState } from 'react';
import { Settings, User, Bell, Brain, Download, Trash2, CheckCircle, XCircle, RefreshCw, Server, Zap } from 'lucide-react';

const settingsApi = {
  getProfile: () => fetch('/api/settings/profile').then(r => r.json()),
  updateProfile: (data: any) => fetch('/api/settings/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getLlm: () => fetch('/api/settings/llm').then(r => r.json()),
  updateLlm: (data: any) => fetch('/api/settings/llm', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  testLlm: () => fetch('/api/settings/llm/test', { method: 'POST' }).then(r => r.json()),
  getOllamaStatus: () => fetch('/api/settings/ollama/status').then(r => r.json()),
  setOllamaUrl: (url: string) => fetch('/api/settings/ollama/url', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json()),
  getOllamaModels: () => fetch('/api/settings/ollama/models').then(r => r.json()),
  getRecommendedModels: () => fetch('/api/settings/ollama/recommended').then(r => r.json()),
  pullModel: (model: string) => fetch('/api/settings/ollama/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) }).then(r => r.json()),
  deleteModel: (name: string) => fetch(`/api/settings/ollama/models/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(r => r.json()),
  getNotifications: () => fetch('/api/settings/notifications').then(r => r.json()),
  updateNotifications: (data: any) => fetch('/api/settings/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
};

export default function SettingsView() {
  const [tab, setTab] = useState<'profile' | 'llm' | 'ollama' | 'notifications'>('llm');
  const [profile, setProfile] = useState<any>(null);
  const [llmConfig, setLlmConfig] = useState<any>(null);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [ollamaModels, setOllamaModels] = useState<any[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [pulling, setPulling] = useState<string | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [newApiKey, setNewApiKey] = useState('');
  const [pullModelName, setPullModelName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [p, l, n, rec] = await Promise.all([
        settingsApi.getProfile(),
        settingsApi.getLlm(),
        settingsApi.getNotifications(),
        settingsApi.getRecommendedModels(),
      ]);
      setProfile(p);
      setLlmConfig(l);
      setNotifications(n);
      setRecommendedModels(rec.models || []);
    } catch (e) {}
    setLoading(false);
  };

  const loadOllama = async () => {
    try {
      const [status, models] = await Promise.all([
        settingsApi.getOllamaStatus(),
        settingsApi.getOllamaModels().catch(() => ({ models: [] })),
      ]);
      setOllamaStatus(status);
      setOllamaModels(models.models || []);
      setOllamaUrl(status.url || 'http://localhost:11434');
    } catch (e) {}
  };

  useEffect(() => { if (tab === 'ollama') loadOllama(); }, [tab]);

  const handleLlmSave = async (updates: any) => {
    const result = await settingsApi.updateLlm({ ...llmConfig, ...updates, apiKey: updates.apiKey || undefined });
    setLlmConfig(result);
    setTestResult(null);
  };

  const handleTestLlm = async () => {
    setTestResult(null);
    const result = await settingsApi.testLlm();
    setTestResult(result);
  };

  const handlePullModel = async (modelName: string) => {
    setPulling(modelName);
    try {
      await settingsApi.pullModel(modelName);
      await loadOllama();
    } catch (e) {}
    setPulling(null);
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`'${modelName}' 모델을 삭제하시겠습니까?`)) return;
    await settingsApi.deleteModel(modelName);
    await loadOllama();
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${bytes} B`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  const tabs = [
    { id: 'llm', icon: Brain, label: 'AI / LLM 설정' },
    { id: 'ollama', icon: Server, label: 'Ollama 모델 관리' },
    { id: 'profile', icon: User, label: '프로필' },
    { id: 'notifications', icon: Bell, label: '알림 설정' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-6 h-6" /> 설정</h1>
        <p className="text-gray-500 mt-1">플랫폼 설정, AI 모델, 프로필을 관리합니다.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* LLM Settings */}
      {tab === 'llm' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">LLM 제공자 선택</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o, GPT-4o-mini', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
                { id: 'gemini', name: 'Google Gemini', desc: 'Gemini 1.5 Flash/Pro', models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'] },
                { id: 'ollama', name: 'Ollama (Local)', desc: '로컬 LLM 실행', models: ['llama3.1:8b', 'gemma2:9b', 'qwen2.5:7b', 'mistral:7b'] },
              ].map(p => (
                <button key={p.id} onClick={() => handleLlmSave({ provider: p.id, model: p.models[0] })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    llmConfig?.provider === p.id ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-200 hover:border-primary-300'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{p.name}</span>
                    {llmConfig?.provider === p.id && <CheckCircle className="w-5 h-5 text-primary-600" />}
                  </div>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </button>
              ))}
            </div>

            {/* Model Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">모델</label>
                <select value={llmConfig?.model || ''} onChange={(e) => handleLlmSave({ model: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {llmConfig?.provider === 'openai' && <>
                    <option value="gpt-4o-mini">gpt-4o-mini (빠르고 저렴)</option>
                    <option value="gpt-4o">gpt-4o (고성능)</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo (경제적)</option>
                  </>}
                  {llmConfig?.provider === 'gemini' && <>
                    <option value="gemini-1.5-flash">gemini-1.5-flash (빠름)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (고성능)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (최신)</option>
                  </>}
                  {llmConfig?.provider === 'ollama' && <>
                    <option value="llama3.1:8b">llama3.1:8b</option>
                    <option value="gemma2:9b">gemma2:9b</option>
                    <option value="gemma2:27b">gemma2:27b</option>
                    <option value="qwen2.5:7b">qwen2.5:7b</option>
                    <option value="qwen2.5:14b">qwen2.5:14b</option>
                    <option value="mistral:7b">mistral:7b</option>
                    <option value="deepseek-r1:8b">deepseek-r1:8b</option>
                    {ollamaModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name} (설치됨)</option>
                    ))}
                  </>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                <input type="range" min="0" max="1" step="0.1" value={llmConfig?.temperature ?? 0.7}
                  onChange={(e) => handleLlmSave({ temperature: parseFloat(e.target.value) })}
                  className="w-full" />
                <span className="text-xs text-gray-500">{llmConfig?.temperature ?? 0.7}</span>
              </div>
            </div>
          </div>

          {/* API Key */}
          {llmConfig?.provider !== 'ollama' && (
            <div className="card">
              <h3 className="font-semibold mb-3">API Key 설정</h3>
              <div className="flex gap-2">
                <input type="password" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={llmConfig?.apiKeySet ? '현재 키 설정됨 (변경하려면 새 키 입력)' : 'API Key를 입력하세요'}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={() => { handleLlmSave({ apiKey: newApiKey }); setNewApiKey(''); }}
                  disabled={!newApiKey} className="btn-primary text-sm disabled:opacity-50">저장</button>
              </div>
              {llmConfig?.apiKeySet && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> API Key가 설정되어 있습니다: {llmConfig.apiKey}
                </p>
              )}
            </div>
          )}

          {/* Connection Test */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">연결 테스트</h3>
              <button onClick={handleTestLlm} className="btn-secondary text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" /> 테스트 실행
              </button>
            </div>
            {testResult && (
              <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                  <span className="font-medium">{testResult.success ? '연결 성공' : '연결 실패'}</span>
                  <span className="text-xs text-gray-500">({testResult.provider} / {testResult.model})</span>
                </div>
                {testResult.success && (
                  <>
                    <p className="text-sm text-gray-700 mb-1">{testResult.response}</p>
                    <p className="text-xs text-gray-500">응답 시간: {testResult.latencyMs}ms</p>
                  </>
                )}
                {!testResult.success && <p className="text-sm text-red-700">{testResult.error}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ollama Model Management */}
      {tab === 'ollama' && (
        <div className="space-y-6">
          {/* Ollama Server Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" /> Ollama 서버 상태
            </h2>
            <div className="flex items-center gap-4 mb-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                ollamaStatus?.running ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {ollamaStatus?.running ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {ollamaStatus?.running ? `실행 중 (v${ollamaStatus.version})` : '연결 안됨'}
              </div>
              <button onClick={loadOllama} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 새로고침
              </button>
            </div>
            <div className="flex gap-2">
              <input type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={async () => { await settingsApi.setOllamaUrl(ollamaUrl); loadOllama(); }}
                className="btn-secondary text-sm">URL 변경</button>
            </div>
            {!ollamaStatus?.running && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Ollama가 실행되지 않고 있습니다. 터미널에서 <code className="bg-yellow-100 px-1 rounded">ollama serve</code>를 실행하세요.
              </div>
            )}
          </div>

          {/* Installed Models */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">설치된 모델 ({ollamaModels.length}개)</h2>
            {ollamaModels.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">설치된 모델이 없습니다. 아래에서 모델을 다운로드하세요.</p>
            ) : (
              <div className="space-y-2">
                {ollamaModels.map(model => (
                  <div key={model.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{model.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatSize(model.size)} | {model.details?.parameterSize || '-'} | {model.details?.quantizationLevel || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleLlmSave({ provider: 'ollama', model: model.name })}
                        className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200">사용</button>
                      <button onClick={() => handleDeleteModel(model.name)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Download Model */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" /> 모델 다운로드
            </h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={pullModelName} onChange={(e) => setPullModelName(e.target.value)}
                placeholder="모델 이름 입력 (예: llama3.1:8b, gemma2:9b)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={() => { handlePullModel(pullModelName); setPullModelName(''); }}
                disabled={!pullModelName || !!pulling} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                {pulling === pullModelName ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> 다운로드 중</> : <><Download className="w-4 h-4" /> 다운로드</>}
              </button>
            </div>

            {/* Recommended Models */}
            <h3 className="font-medium text-sm text-gray-700 mb-2">추천 모델</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recommendedModels.map(model => (
                <div key={model.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{model.name}</p>
                    <p className="text-xs text-gray-500">{model.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{model.size}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{model.category}</span>
                    </div>
                  </div>
                  <button onClick={() => handlePullModel(model.name)}
                    disabled={!!pulling}
                    className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1">
                    {pulling === model.name ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Download className="w-3 h-3" />}
                    {pulling === model.name ? '...' : '설치'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && profile && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">프로필 설정</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input type="text" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input type="email" value={profile.email || ''} disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
              <input type="date" value={profile.birthDate || ''} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
              <select value={profile.gender || ''} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
          </div>
          <button onClick={() => settingsApi.updateProfile(profile)} className="btn-primary mt-4 text-sm">저장</button>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && notifications && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">알림 설정</h2>
          <div className="space-y-4">
            {[
              { key: 'missionReminder', label: '주간 미션 알림', desc: '미완료 미션에 대한 리마인더' },
              { key: 'riskAlert', label: '위험 신호 알림', desc: '검진 수치 이상 시 즉시 알림' },
              { key: 'weeklyReport', label: '주간 리포트', desc: '매주 활동 요약 리포트' },
              { key: 'checkupReminder', label: '검진 리마인더', desc: '정기 검진 시기 알림' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={notifications[item.key]}
                    onChange={(e) => {
                      const updated = { ...notifications, [item.key]: e.target.checked };
                      setNotifications(updated);
                      settingsApi.updateNotifications(updated);
                    }}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
