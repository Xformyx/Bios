const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health Data
  getSummary: () => fetchApi<any>('/health-data/summary'),
  getCheckups: () => fetchApi<any[]>('/health-data/checkups'),
  getGoals: () => fetchApi<any[]>('/health-data/goals'),
  completeMission: (goalId: string, missionId: string) =>
    fetchApi<any>(`/health-data/goals/${goalId}/missions/${missionId}/complete`, { method: 'PATCH' }),
  addObservation: (data: any) =>
    fetchApi<any>('/health-data/observations', { method: 'POST', body: JSON.stringify(data) }),

  // Wearable
  getWearableData: (days = 7) => fetchApi<any[]>(`/wearable?days=${days}`),
  getWearableConnections: () => fetchApi<any>('/wearable/connections'),
  getWearableTrends: () => fetchApi<any>('/wearable/trends'),
  addWearableData: (data: any) =>
    fetchApi<any>('/wearable', { method: 'POST', body: JSON.stringify(data) }),

  // AI Coach
  getMessages: () => fetchApi<any[]>('/ai-coach/messages'),
  sendMessage: (message: string) =>
    fetchApi<any>('/ai-coach/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  getHospitalQuestions: () => fetchApi<any>('/ai-coach/hospital-questions'),

  // Report
  getReports: () => fetchApi<any[]>('/report'),
  generateReport: () => fetchApi<any>('/report/generate', { method: 'POST' }),

  // Consent
  getConsents: () => fetchApi<any[]>('/consent'),
  grantConsent: (data: any) =>
    fetchApi<any>('/consent', { method: 'POST', body: JSON.stringify(data) }),
  revokeConsent: (id: string) =>
    fetchApi<any>(`/consent/${id}/revoke`, { method: 'PATCH' }),

  // Audit
  getAuditLogs: (page = 1) => fetchApi<any>(`/audit?page=${page}`),
  getAuditSummary: () => fetchApi<any>('/audit/summary'),

  // Upload
  uploadCheckup: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/upload/checkup`, { method: 'POST', body: formData }).then(r => r.json());
  },

  // Auth
  getMe: () => fetchApi<any>('/auth/me'),
};
