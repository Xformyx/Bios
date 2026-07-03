// FHIR R4 기반 데이터 모델 타입 정의

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
  };
}

export interface Patient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: Array<{ system: string; value: string }>;
  name?: Array<{ family: string; given: string[] }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{ system: string; value: string }>;
}

export interface Observation extends FHIRResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }>; text?: string };
  subject?: { reference: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string; system?: string; code?: string };
  interpretation?: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  referenceRange?: Array<{ low?: { value: number; unit: string }; high?: { value: number; unit: string }; text?: string }>;
}

export interface DiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  status: 'registered' | 'partial' | 'preliminary' | 'final';
  category?: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }>; text?: string };
  subject?: { reference: string };
  effectiveDateTime?: string;
  result?: Array<{ reference: string }>;
  conclusion?: string;
}

export interface Consent extends FHIRResource {
  resourceType: 'Consent';
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive';
  scope: { coding: Array<{ system: string; code: string; display: string }> };
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  patient?: { reference: string };
  dateTime?: string;
  provision?: {
    type: 'deny' | 'permit';
    period?: { start: string; end?: string };
    purpose?: Array<{ system: string; code: string; display: string }>;
    data?: Array<{ meaning: string; reference: { reference: string } }>;
  };
}

export interface CarePlan extends FHIRResource {
  resourceType: 'CarePlan';
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  title?: string;
  description?: string;
  subject?: { reference: string };
  period?: { start: string; end?: string };
  activity?: Array<{
    detail?: {
      kind?: string;
      code?: { coding: Array<{ system: string; code: string; display: string }>; text?: string };
      status: string;
      description?: string;
      scheduledString?: string;
    };
  }>;
}

export interface AuditEvent extends FHIRResource {
  resourceType: 'AuditEvent';
  type: { system: string; code: string; display: string };
  action?: 'C' | 'R' | 'U' | 'D' | 'E';
  recorded: string;
  agent: Array<{ who?: { reference: string }; requestor: boolean }>;
  source: { observer: { reference: string } };
  entity?: Array<{ what?: { reference: string }; name?: string }>;
}

// 앱 내부 타입

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
