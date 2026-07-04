import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, FileText, MessageCircle, Shield, Upload, BarChart3, ClipboardList, Heart, Settings, Pill, Search, Menu, X, Dna } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CheckupUpload from './pages/CheckupUpload';
import HealthCoach from './pages/HealthCoach';
import WearableView from './pages/WearableView';
import ReportView from './pages/ReportView';
import ConsentView from './pages/ConsentView';
import AuditView from './pages/AuditView';
import GoalsView from './pages/GoalsView';
import MyHealthWayView from './pages/MyHealthWayView';
import SettingsView from './pages/SettingsView';
import NHISCheckupView from './pages/NHISCheckupView';
import DailyRecordView from './pages/DailyRecordView';
import MedicalInfoView from './pages/MedicalInfoView';
import GenomicView from './pages/GenomicView';
import { ToastProvider } from './components/Toast';
import { ThemeToggle } from './components/ThemeToggle';
import { Onboarding } from './components/Onboarding';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('onboarding_completed');
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // 라우트 변경 시 모바일 사이드바 닫기
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  const navItems = [
    { to: '/', icon: BarChart3, label: '대시보드' },
    { to: '/upload', icon: Upload, label: '검진 업로드' },
    { to: '/nhis', icon: FileText, label: '검진데이터 조회' },
    { to: '/daily', icon: Pill, label: '일일 기록' },
    { to: '/medical', icon: Search, label: '의료정보' },
    { to: '/genomic', icon: Dna, label: '유전체' },
    { to: '/wearable', icon: Activity, label: '웨어러블' },
    { to: '/goals', icon: ClipboardList, label: '90일 목표' },
    { to: '/coach', icon: MessageCircle, label: 'AI 코치' },
    { to: '/report', icon: FileText, label: '리포트' },
    { to: '/myhealthway', icon: Activity, label: '고속도로 연동' },
    { to: '/consent', icon: Shield, label: '동의 관리' },
    { to: '/audit', icon: ClipboardList, label: '접근 로그' },
    { to: '/settings', icon: Settings, label: '설정' },
  ];

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fadeIn"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed h-full z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:z-30`}
            role="navigation"
            aria-label="메인 네비게이션"
          >
            <div className="p-6">
              {/* Logo */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Heart className="w-7 h-7 text-primary-600" aria-hidden="true" />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">MyHealth</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Market Lite</p>
                  </div>
                </div>
                <button
                  className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="mb-6">
                <ThemeToggle />
              </div>

              {/* Navigation */}
              <nav className="space-y-1" aria-label="페이지 네비게이션">
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* User Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center" aria-hidden="true">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-400">김</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">김건강</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">demo@myhealth.kr</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64 min-h-screen">
            {/* Mobile Header */}
            <header className="sticky top-0 z-30 lg:hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="메뉴 열기"
                >
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  <span className="font-bold text-gray-900 dark:text-gray-100">MyHealth</span>
                </div>
                <ThemeToggle />
              </div>
            </header>

            {/* Page Content */}
            <div className="p-4 md:p-6 lg:p-8 animate-fadeIn">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<CheckupUpload />} />
                <Route path="/nhis" element={<NHISCheckupView />} />
                <Route path="/daily" element={<DailyRecordView />} />
                <Route path="/medical" element={<MedicalInfoView />} />
            <Route path="/genomic" element={<GenomicView />} />
                <Route path="/wearable" element={<WearableView />} />
                <Route path="/goals" element={<GoalsView />} />
                <Route path="/coach" element={<HealthCoach />} />
                <Route path="/report" element={<ReportView />} />
                <Route path="/myhealthway" element={<MyHealthWayView />} />
                <Route path="/consent" element={<ConsentView />} />
                <Route path="/audit" element={<AuditView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* Onboarding */}
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
