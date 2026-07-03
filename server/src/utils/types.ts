// Re-export shared types for server use
export interface User {
  id: string;
  email: string;
  name: string;
  birthDate?: string;
  gender?: string;
  createdAt: string;
}

export interface ConsentItem {
  id: string;
  userId: string;
  category: string;
  purpose: string;
  status: 'active' | 'revoked';
  grantedAt: string;
  revokedAt?: string;
  expiresAt?: string;
}

export interface HealthCheckupResult {
  id: string;
  userId: string;
  checkupDate: string;
  source: 'upload' | 'api' | 'manual';
  observations: ObservationData[];
  reportUrl?: string;
  createdAt: string;
}

export interface ObservationData {
  id: string;
  code: string;
  display: string;
  value: number;
  unit: string;
  status: 'normal' | 'caution' | 'warning' | 'critical';
  referenceRange?: { low?: number; high?: number };
  category: string;
}

export interface WearableData {
  id: string;
  userId: string;
  source: 'apple_health' | 'google_health' | 'samsung_health' | 'manual';
  date: string;
  steps?: number;
  sleepHours?: number;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  weight?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodGlucose?: number;
}

export interface HealthGoal {
  id: string;
  userId: string;
  carePlanId?: string;
  title: string;
  description: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  weeklyMissions: WeeklyMission[];
}

export interface WeeklyMission {
  id: string;
  week: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface AICoachMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    type?: 'explanation' | 'action_plan' | 'question_suggestion' | 'warning';
    references?: string[];
    limitations?: string[];
  };
}

export interface HospitalReport {
  id: string;
  userId: string;
  title: string;
  generatedAt: string;
  sections: ReportSection[];
  pdfUrl?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  observations?: ObservationData[];
  trends?: TrendData[];
}

export interface TrendData {
  label: string;
  data: Array<{ date: string; value: number }>;
  unit: string;
  trend: 'improving' | 'stable' | 'worsening';
}
