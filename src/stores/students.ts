import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import { useClassesStore } from '@/stores/classes'
import type { Student } from '@/types'

export type StudentDraft = Pick<
  Student,
  'studentNumber' | 'firstName' | 'lastName' | 'email' | 'phone' | 'gender' | 'status'
> & { classId?: string }

interface ApiStudent {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  gender: Student['gender'] | null
  status: Student['status']
  createdAt: string
}

function gradeFromName(name: string | undefined): string {
  const match = name?.match(/(?:grade\s*)?(\d{1,2})/i)

  return match ? `Grade ${match[1]}` : name ? 'Enrolled' : 'Unassigned'
}

function mapStudent(apiStudent: ApiStudent, enrollment?: { classId: string; className: string; createdAt: string }): Student {
  return {
    id: apiStudent.id,
    studentNumber: apiStudent.studentNumber,
    firstName: apiStudent.firstName,
    lastName: apiStudent.lastName,
    email: apiStudent.email,
    phone: apiStudent.phoneNumber ?? '',
    gender: apiStudent.gender ?? 'other',
    grade: gradeFromName(enrollment?.className),
    className: enrollment?.className ?? '',
    classId: enrollment?.classId,
    status: apiStudent.status,
    enrolledAt: enrollment?.createdAt ?? apiStudent.createdAt,
  }
}

export const useStudentsStore = defineStore('students', () => {
  const students = ref<Student[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null
  const classesStore = useClassesStore()

  const total = computed(() => students.value.length)
  const active = computed(() => students.value.filter((student) => student.status === 'active'))
  const activeCount = computed(() => active.value.length)

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (students.value.length && !force) return

    loading.value = true
    loadPromise = Promise.all([apiRequest<ApiStudent[]>('/students'), classesStore.load()])
      .then(([response]) => {
        const enrollmentByStudent = new Map<string, { classId: string; className: string; createdAt: string }>()
        for (const schoolClass of classesStore.classes) {
          for (const enrollment of schoolClass.enrollments ?? []) {
            if (enrollment.status === 'active' && !enrollmentByStudent.has(enrollment.student.id)) {
              enrollmentByStudent.set(enrollment.student.id, {
                classId: schoolClass.id,
                className: schoolClass.name,
                createdAt: enrollment.enrolledAt,
              })
            }
          }
        }
        students.value = response.map((student) => mapStudent(student, enrollmentByStudent.get(student.id)))
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  async function create(draft: StudentDraft): Promise<Student> {
    const response = await apiRequest<ApiStudent>('/students', {
      method: 'POST',
      body: JSON.stringify({
        studentNumber: draft.studentNumber,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phoneNumber: draft.phone,
        gender: draft.gender,
        status: draft.status,
      }),
    })
    if (draft.classId) {
      await apiRequest(`/students/${response.id}/enrollments`, {
        method: 'POST',
        body: JSON.stringify({ classId: draft.classId }),
      })
    }
    await load(true)
    return find(response.id) ?? mapStudent(response)
  }

  async function update(id: string, draft: StudentDraft): Promise<void> {
    const current = find(id)
    await apiRequest(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        studentNumber: draft.studentNumber,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phoneNumber: draft.phone,
        gender: draft.gender,
        status: draft.status,
      }),
    })

    if (current?.classId !== draft.classId) {
      const activeEnrollment = (classesStore.find(current?.classId ?? '')?.enrollments ?? []).find(
        (enrollment) => enrollment.student.id === id && enrollment.status === 'active',
      )
      if (activeEnrollment && current?.classId) {
        await apiRequest(`/students/${id}/enrollments/${activeEnrollment.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'withdrawn', reason: 'Moved to another class' }),
        })
      }
      if (draft.classId) {
        await apiRequest(`/students/${id}/enrollments`, {
          method: 'POST',
          body: JSON.stringify({ classId: draft.classId }),
        })
      }
    }
    await Promise.all([load(true), classesStore.load(true)])
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/students/${id}`, { method: 'DELETE' })
    students.value = students.value.filter((student) => student.id !== id)
  }

  function find(id: string): Student | undefined {
    return students.value.find((student) => student.id === id)
  }

  function countByClass(className: string): number {
    return students.value.filter(
      (student) => student.className === className && student.status === 'active',
    ).length
  }

  return { students, loading, total, activeCount, load, create, update, remove, find, countByClass }
})
