import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'

import { readStorage, removeStorage, writeStorage } from '@/services/storage'
import { apiPost, SESSION_EXPIRED_EVENT } from '@/services/api'
import type { Credentials, RoleKey, User } from '@/types'

interface ApiUser {
  id: string
  email: string
  role: RoleKey
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: ApiUser
}

const roleLabels: Record<RoleKey, User['role']> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
}

function displayName(email: string): string {
  const username = email.split('@')[0] ?? email

  return username
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function toUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: displayName(apiUser.email),
    email: apiUser.email,
    role: roleLabels[apiUser.role],
    roleKey: apiUser.role,
  }
}

function roleKeyFromLegacy(user: User): RoleKey {
  if (user.roleKey) return user.roleKey
  if (user.role === 'Administrator') return 'admin'
  if (user.role === 'Teacher') return 'teacher'

  return 'student'
}

function normalizeStoredUser(user: User | null): User | null {
  return user ? { ...user, roleKey: roleKeyFromLegacy(user) } : null
}

export const useAuthStore = defineStore('auth', () => {
  const hasToken = readStorage<string | null>('auth-access-token', null) !== null
  const user = ref<User | null>(
    hasToken ? normalizeStoredUser(readStorage<User | null>('auth-user', null)) : null,
  )

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed<RoleKey | null>(() => user.value?.roleKey ?? null)
  const isAdmin = computed(() => role.value === 'admin')
  const isTeacher = computed(() => role.value === 'teacher')
  const isStudent = computed(() => role.value === 'student')
  const isStaff = computed(() => isAdmin.value || isTeacher.value)

  function hasRole(...roles: RoleKey[]): boolean {
    return role.value !== null && roles.includes(role.value)
  }

  async function login(credentials: Credentials): Promise<void> {
    const response = await apiPost<AuthResponse>('/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
    })
    const profile = toUser(response.user)

    writeStorage('auth-access-token', response.accessToken)
    writeStorage('auth-refresh-token', response.refreshToken)
    writeStorage('auth-user', profile)
    user.value = profile
  }

  async function logout(): Promise<void> {
    const refreshToken = readStorage<string | null>('auth-refresh-token', null)

    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken })
    } catch {
      // The local session must still end if the API is unavailable.
    } finally {
      user.value = null
      removeStorage('auth-user')
      removeStorage('auth-access-token')
      removeStorage('auth-refresh-token')
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
  }

  function updateProfile(name: string): void {
    if (!user.value) return

    user.value = { ...user.value, name: name.trim() }
    writeStorage('auth-user', user.value)
  }

  const onSessionExpired = () => {
    user.value = null
  }
  window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  onScopeDispose(() => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired))

  return {
    user,
    isAuthenticated,
    role,
    isAdmin,
    isTeacher,
    isStudent,
    isStaff,
    hasRole,
    login,
    logout,
    updateProfile,
  }
})
