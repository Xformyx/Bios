import { useEffect, useState } from 'react';
import { Target, CheckCircle, Circle, Calendar } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function GoalsView() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGoals().then(data => {
      setGoals(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCompleteMission = async (goalId: string, missionId: string) => {
    try {
      const updated = await api.completeMission(goalId, missionId);
      setGoals(prev => prev.map(g => g.id === goalId ? updated : g));
    } catch (e) {
      console.error('미션 완료 처리 실패');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">90일 건강 목표</h1>
        <p className="text-gray-500 mt-1">대사건강 개선을 위한 단계별 미션을 수행하세요.</p>
      </div>

      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">아직 설정된 목표가 없습니다</h3>
          <p className="text-gray-500">검진 결과를 업로드하면 맞춤 건강 목표가 생성됩니다.</p>
        </div>
      ) : (
        goals.map(goal => {
          const completedCount = goal.weeklyMissions.filter((m: any) => m.completed).length;
          const progress = (completedCount / goal.weeklyMissions.length) * 100;

          return (
            <div key={goal.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-600" />
                    {goal.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  goal.status === 'active' ? 'bg-green-100 text-green-800' :
                  goal.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {goal.status === 'active' ? '진행 중' : goal.status === 'completed' ? '완료' : '취소'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">진행률</span>
                  <span className="font-medium">{completedCount}/{goal.weeklyMissions.length} 미션 ({progress.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              {/* Period */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Calendar className="w-4 h-4" />
                <span>{goal.startDate} ~ {goal.endDate}</span>
              </div>

              {/* Missions */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">주간 미션</h3>
                {goal.weeklyMissions.map((mission: any) => (
                  <div
                    key={mission.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                      mission.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    <button
                      onClick={() => !mission.completed && handleCompleteMission(goal.id, mission.id)}
                      disabled={mission.completed}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {mission.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-primary-500 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{mission.week}주차</span>
                        <span className={`font-medium ${mission.completed ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                          {mission.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{mission.description}</p>
                      {mission.completedAt && (
                        <p className="text-xs text-green-600 mt-1">완료: {new Date(mission.completedAt).toLocaleDateString('ko-KR')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
