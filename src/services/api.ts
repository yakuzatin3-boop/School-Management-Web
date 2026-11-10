import { readStorage, removeStorage, writeStorage } from '@/services/storage'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}`.replace(/\/$/, '')
const SESSION_EXPIRED_EVENT = 'school-management:session-expired'

interface ApiErrorBody {
  message?: string | string[]
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface TokenResponse {
  accessToken: string
  refreshToken: string
}

function clearSession(): void {
  removeStorage('auth-access-token')
  removeStorage('auth-refresh-token')
  removeStorage('auth-user')
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  if (Array.isArray(body?.message)) return body.message.join(', ')
  return body?.message ?? body?.error ?? fallback
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = readStorage<string | null>('auth-refresh-token', null)
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) return false

    const tokens = (await response.json()) as TokenResponse
    writeStorage('auth-access-token', tokens.accessToken)
    writeStorage('auth-refresh-token', tokens.refreshToken)
    return true
  } catch {
    return false
  }
}

async function send<T>(path: string, init: RequestInit, retry: boolean): Promise<T> {
  const headers = new Headers(init.headers)
  const accessToken = readStorage<string | null>('auth-access-token', null)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshAccessToken()) return send<T>(path, init, false)
    clearSession()
  }

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.statusText || 'Request failed'), response.status)
  }

  return body as T
}

export function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return send<T>(path, { ...init, headers }, true)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export { SESSION_EXPIRED_EVENT }
