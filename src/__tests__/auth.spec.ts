import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    json: async () => body,
  } as Response
}

describe('auth store', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs in with the API and stores the returned session', async () => {
    const auth = useAuthStore()
    fetchMock.mockResolvedValue(
      jsonResponse({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-id', email: 'alex.morgan@school.edu', role: 'admin' },
      }),
    )

    await auth.login({ email: 'alex.morgan@school.edu', password: 'secret-password' })

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('user-id')
    expect(auth.user?.name).toBe('Alex Morgan')
    expect(auth.user?.role).toBe('Administrator')
    expect(JSON.parse(localStorage.getItem('school-management:auth-access-token') ?? 'null')).toBe(
      'access-token',
    )
    expect(JSON.parse(localStorage.getItem('school-management:auth-refresh-token') ?? 'null')).toBe(
      'refresh-token',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces invalid credentials without creating a session', async () => {
    const auth = useAuthStore()
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Invalid email or password' }, 401))

    await expect(auth.login({ email: 'alex@school.edu', password: 'wrong-password' })).rejects.toThrow(
      'Invalid email or password',
    )
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('clears the session and revokes the refresh token on logout', async () => {
    const auth = useAuthStore()
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: { id: 'user-id', email: 'teacher@school.edu', role: 'teacher' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'Logged out successfully' }))

    await auth.login({ email: 'teacher@school.edu', password: 'secret-password' })
    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('school-management:auth-access-token')).toBeNull()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-token' }),
      }),
    )
  })

  it('refreshes an expired access token and retries the protected request', async () => {
    const auth = useAuthStore()
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'old-access',
          refreshToken: 'old-refresh',
          user: { id: 'user-id', email: 'admin@school.edu', role: 'admin' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }))
      .mockResolvedValueOnce(jsonResponse([{ id: 'student-id' }]))

    await auth.login({ email: 'admin@school.edu', password: 'secret-password' })
    const students = await apiRequest<Array<{ id: string }>>('/students')

    expect(students).toEqual([{ id: 'student-id' }])
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(JSON.parse(localStorage.getItem('school-management:auth-access-token') ?? 'null')).toBe(
      'new-access',
    )
    expect(JSON.parse(localStorage.getItem('school-management:auth-refresh-token') ?? 'null')).toBe(
      'new-refresh',
    )
  })
})
