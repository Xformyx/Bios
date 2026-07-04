import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, FileText, MessageCircle, Shield, Upload, BarChart3, ClipboardList, Heart, Settings, Pill, Search } from 'lucide-react';
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

function App() {
  const navItems = [
    { to: '/', icon: BarChart3, label: '대시보드' },
    { to: '/upload', icon: Upload, label: '검진 업로드' },
    { to: '/nhis', icon: FileText, label: '검진데이터 조회' },
    { to: '/daily', icon: Pill, label: '일일 기록' },
    { to: '/medical', icon: Search, label: '의료정보' },
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
    <BrowserRouter>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Heart className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">MyHealth</h1>
                <p className="text-xs text-gray-500">Market Lite</p>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">김</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">김건강</p>
                <p className="text-xs text-gray-500">demo@myhealth.kr</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<CheckupUpload />} />
            <Route path="/nhis" element={<NHISCheckupView />} />
            <Route path="/daily" element={<DailyRecordView />} />
            <Route path="/medical" element={<MedicalInfoView />} />
            <Route path="/wearable" element={<WearableView />} />
            <Route path="/goals" element={<GoalsView />} />
            <Route path="/coach" element={<HealthCoach />} />
            <Route path="/report" element={<ReportView />} />
            <Route path="/myhealthway" element={<MyHealthWayView />} />
            <Route path="/consent" element={<ConsentView />} />
            <Route path="/audit" element={<AuditView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
