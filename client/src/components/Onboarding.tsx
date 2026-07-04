import { useState } from 'react';
import { Heart, Upload, Activity, Brain, Shield, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Heart,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      title: 'MyHealth에 오신 것을 환영합니다',
      description: '건강검진 결과를 쉽게 이해하고, AI가 90일 건강 행동 계획을 제안하는 개인 건강 데이터 코치입니다.',
      detail: '의료진을 대체하지 않으며, 건강 데이터를 정리하고 생활습관 개선을 돕는 보조 도구입니다.',
    },
    {
      icon: Upload,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      title: '건강검진 결과를 가져오세요',
      description: '검진 결과 PDF를 업로드하거나, 본인인증 후 건강보험공단에서 직접 조회할 수 있습니다.',
      detail: 'OCR로 수치를 자동 추출하고, 정상/주의/경고/위험을 한눈에 표시합니다.',
    },
    {
      icon: Activity,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      title: '웨어러블과 일일 기록을 연결하세요',
      description: 'Apple Health, Google Health Connect 등에서 걸음 수, 수면, 심박 데이터를 가져옵니다.',
      detail: '매일 혈압, 혈당, 체중을 기록하고 복약 체크리스트를 관리할 수 있습니다.',
    },
    {
      icon: Brain,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      title: 'AI 코치가 건강 계획을 제안합니다',
      description: '검진 수치와 생활 데이터를 분석하여 90일 건강 행동 계획과 주간 미션을 생성합니다.',
      detail: '병원 방문 시 의사에게 물어볼 질문도 자동으로 준비해드립니다.',
    },
    {
      icon: Shield,
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      title: '데이터는 안전하게 보호됩니다',
      description: '모든 데이터는 암호화되어 저장되며, 동의/철회를 직접 관리할 수 있습니다.',
      detail: '접근 로그를 통해 누가 언제 데이터를 조회했는지 확인할 수 있습니다.',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70" role="dialog" aria-modal="true" aria-label="시작 가이드">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl ${currentStep.color} flex items-center justify-center mx-auto mb-6`}>
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{currentStep.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">{currentStep.description}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{currentStep.detail}</p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={() => onComplete()}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            건너뛰기
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary text-sm py-2 px-4">
                이전
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary text-sm py-2 px-4 flex items-center gap-1">
                다음 <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onComplete} className="btn-primary text-sm py-2 px-4 flex items-center gap-1">
                <Check className="w-4 h-4" /> 시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
