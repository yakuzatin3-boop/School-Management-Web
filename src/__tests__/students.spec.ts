import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useStudentsStore } from '@/stores/students'

const draft = {
  firstName: 'Test',
  lastName: 'Student',
  email: 'test.student@school.edu',
  studentNumber: 'ST-0001',
  phone: '+1 (555) 000-0000',
  gender: 'other' as const,
  grade: 'Grade 9',
  className: '9A',
  status: 'active' as const,
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

describe('students store', () => {
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

  it('creates, updates, and removes a student through the API', async () => {
    const students = useStudentsStore()
    const apiStudent = {
      id: 'student-id',
      studentNumber: draft.studentNumber,
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phoneNumber: draft.phone,
      gender: draft.gender,
      status: draft.status,
      createdAt: '2026-10-01T00:00:00.000Z',
    }
    let student: Record<string, unknown> | null = { ...apiStudent }

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (url.endsWith('/classes')) return jsonResponse([])
      if (url.includes('/enrollments')) return jsonResponse([])
      if (url.endsWith('/students') && method === 'GET') {
        return jsonResponse(student ? [student] : [])
      }
      if (url.endsWith('/students') && method === 'POST') return jsonResponse(student)
      if (url.includes('/students/') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        if (student) student = { ...student, ...body }
        return jsonResponse(student ?? {})
      }
      if (url.includes('/students/') && method === 'DELETE') {
        student = null
        return jsonResponse({})
      }

      return jsonResponse({})
    })

    const created = await students.create(draft)
    expect(students.total).toBe(1)
    expect(students.find(created.id)?.email).toBe(draft.email)

    await students.update(created.id, { ...draft, lastName: 'Updated' })
    expect(students.find(created.id)?.lastName).toBe('Updated')

    await students.remove(created.id)
    expect(students.total).toBe(0)
    expect(students.find(created.id)).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/students',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
