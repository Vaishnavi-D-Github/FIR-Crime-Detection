import type { PoliceFirSummary, PoliceOfficer, PredictionResult, SessionResponse, User, VerifiedFir } from '../types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...(options?.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed')
  }
  return data as T
}

export const api = {
  getSession: () => request<SessionResponse>('/api/auth/session'),

  login: (email: string, password: string) =>
    request<{ user: User; message?: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: { name: string; email: string; password: string; confirm_password: string }) =>
    request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    request<{ success: boolean; email: string; reset_url?: string | null }>('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string, confirm_password: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirm_password }),
    }),

  policeLogin: (officer_userid: string, secret_key: string) =>
    request<{ officer: PoliceOfficer }>('/api/police/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officer_userid, secret_key }),
    }),

  policeLogout: () => request<{ message: string }>('/api/police/logout', { method: 'POST' }),

  policePortal: () =>
    request<{ officer: PoliceOfficer; recent_firs: PoliceFirSummary[]; today: string }>('/api/police/portal'),

  uploadFir: (firId: string, file: File) => {
    const form = new FormData()
    form.append('fir_id', firId)
    form.append('fir_file', file)
    return request<{ filename: string; verified_fir: VerifiedFir }>('/api/upload-fir', {
      method: 'POST',
      body: form,
    })
  },

  predict: (payload: { complaint: string; upload_filename: string; official_fir_id: string }) =>
    request<PredictionResult>('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  registerPoliceFir: (form: FormData) =>
    request<{ message: string; record: VerifiedFir }>('/api/police/register-fir', {
      method: 'POST',
      body: form,
    }),

  ocrStatus: () =>
    request<{ available: boolean; version?: string; message?: string }>('/api/ocr-status'),
}
