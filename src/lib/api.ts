const BASE = '/api'

function getToken(): string {
  return localStorage.getItem('auth_token') || ''
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) h['x-auth-token'] = token
  return h
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: headers(), ...options })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

function get<T>(path: string) { return request<T>(`${BASE}${path}`) }
function post<T>(path: string, body: any) { return request<T>(`${BASE}${path}`, { method: 'POST', body: JSON.stringify(body) }) }
function put<T>(path: string, body: any) { return request<T>(`${BASE}${path}`, { method: 'PUT', body: JSON.stringify(body) }) }
function del<T>(path: string) { return request<T>(`${BASE}${path}`, { method: 'DELETE' }) }

// Auth
export const api = {
  login: (token: string) => post<{ user: any; token: string }>('/auth/login', { token }),

  // Sessions
  getSessions: (limit = 50, offset = 0, dateFrom?: string, dateTo?: string) => {
    let url = `/sessions?limit=${limit}&offset=${offset}`
    if (dateFrom) url += `&date_from=${dateFrom}`
    if (dateTo) url += `&date_to=${dateTo}`
    return get<{ data: any[]; total: number; summarized: number }>(url)
  },
  getSession: (id: string) => get<any>(`/sessions/${id}`),
  importSessions: (rows: any[]) => post<{ ok: boolean; imported: number }>('/sessions/import', { rows }),
  summarizeSessions: (batchSize = 10) => post<{ done: boolean; processed: number; remaining: number }>('/sessions/summarize', { batch_size: batchSize }),
  searchSessions: (query: string, dateFrom?: string, dateTo?: string) =>
    post<{ results: any[]; total: number }>('/sessions/search', { query, date_from: dateFrom, date_to: dateTo }),

  // Scenarios
  getScenarios: () => get<any[]>('/scenarios'),
  createScenario: (data: any) => post<{ id: string }>('/scenarios', data),
  getScenario: (id: string) => get<any>(`/scenarios/${id}`),
  updateScenario: (id: string, data: any) => put<any>(`/scenarios/${id}`, data),
  deleteScenario: (id: string) => del<any>(`/scenarios/${id}`),
  previewScenario: (id: string) => post<{ matched_count: number; results: any[] }>(`/scenarios/${id}/preview`, {}),

  // Dimensions
  getDimensions: () => get<any[]>('/dimensions'),
  createDimension: (data: any) => post<{ id: string }>('/dimensions', data),
  getDimension: (id: string) => get<any>(`/dimensions/${id}`),
  updateDimension: (id: string, data: any) => put<any>(`/dimensions/${id}`, data),
  deleteDimension: (id: string) => del<any>(`/dimensions/${id}`),

  // Runs
  getRuns: () => get<any[]>('/runs'),
  createRun: (data: any) => post<{ id: string; total_sessions: number }>('/runs', data),
  getRun: (id: string) => get<any>(`/runs/${id}`),
  processRun: (id: string, batchSize = 5) => post<{ done: boolean; processed: number; total: number }>(`/runs/${id}/process`, { batch_size: batchSize }),
  getRunReport: (id: string) => get<any>(`/runs/${id}/report`),
  getRunResults: (id: string, limit = 50, offset = 0, dimensionId?: string, category?: string) => {
    let url = `/runs/${id}/results?limit=${limit}&offset=${offset}`
    if (dimensionId) url += `&dimension_id=${dimensionId}`
    if (category) url += `&category=${encodeURIComponent(category)}`
    return get<{ data: any[]; total: number }>(url)
  },

  // Tasks
  getTasks: (params?: { status?: string; assignee_id?: string; run_id?: string }) => {
    let url = '/tasks?'
    if (params?.status) url += `status=${params.status}&`
    if (params?.assignee_id) url += `assignee_id=${params.assignee_id}&`
    if (params?.run_id) url += `run_id=${params.run_id}&`
    return get<any[]>(url)
  },
  updateTask: (id: string, data: any) => put<any>(`/tasks/${id}`, data),
  submitFeedback: (taskId: string, data: any) => post<any>(`/tasks/${taskId}/feedback`, data),

  // Team
  getTeam: () => get<any[]>('/team'),
  addMember: (data: any) => post<{ id: string }>('/team', data),
  updateMember: (id: string, data: any) => put<any>(`/team/${id}`, data),
  deleteMember: (id: string) => del<any>(`/team/${id}`),

  // Settings
  getSettings: () => get<any>('/settings'),
  updateSettings: (data: any) => put<any>('/settings', data),

  // Notify
  sendDingTalk: (runId: string) => post<any>('/notify/dingtalk', { run_id: runId }),

  // Dashboard
  getDashboardSummary: () => get<any>('/dashboard/summary'),
  getSatisfaction: () => get<any[]>('/dashboard/satisfaction'),
}
