import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { Teacher } from '@/types'

export interface TeacherDraft {
  teacherNumber?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  courseId?: string
  status: Teacher['status']
}

interface ApiTeacher {
  id: string
  teacherNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  status: Teacher['status']
  createdAt: string
  teacherSkills?: Array<{ course?: { id: string; name: string } }>
}

interface ApiTeacherSkill {
  id: string
  course: { id: string; name: string }
}

function mapTeacher(apiTeacher: ApiTeacher): Teacher {
  const skills = apiTeacher.teacherSkills ?? []
  return {
    id: apiTeacher.id,
    teacherNumber: apiTeacher.teacherNumber,
    firstName: apiTeacher.firstName,
    lastName: apiTeacher.lastName,
    email: apiTeacher.email,
    phone: apiTeacher.phoneNumber ?? '',
    subject: skills.map((skill) => skill.course?.name).filter(Boolean).join(', ') || 'No course',
    courseIds: skills.map((skill) => skill.course?.id).filter((id): id is string => Boolean(id)),
    status: apiTeacher.status,
    hiredAt: apiTeacher.createdAt,
  }
}

export const useTeachersStore = defineStore('teachers', () => {
  const teachers = ref<Teacher[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  const total = computed(() => teachers.value.length)
  const activeCount = computed(
    () => teachers.value.filter((teacher) => teacher.status === 'active').length,
  )

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (teachers.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<ApiTeacher[]>('/teachers')
      .then((response) => {
        teachers.value = response.map(mapTeacher)
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  async function create(draft: TeacherDraft): Promise<Teacher> {
    const response = await apiRequest<ApiTeacher>('/teachers', {
      method: 'POST',
      body: JSON.stringify({
        teacherNumber: draft.teacherNumber,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phoneNumber: draft.phone,
        status: draft.status,
      }),
    })
    if (draft.courseId) {
      await apiRequest(`/teachers/${response.id}/skills`, {
        method: 'POST',
        body: JSON.stringify({ courseId: draft.courseId }),
      })
    }
    await load(true)
    return find(response.id) ?? mapTeacher(response)
  }

  async function update(id: string, draft: TeacherDraft): Promise<void> {
    await apiRequest(`/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phoneNumber: draft.phone,
        status: draft.status,
      }),
    })
    const skills = await apiRequest<ApiTeacherSkill[]>(`/teachers/${id}/skills`)
    const matchingSkill = skills.find((skill) => skill.course.id === draft.courseId)
    await Promise.all(
      skills
        .filter((skill) => skill.course.id !== draft.courseId)
        .map((skill) => apiRequest(`/teachers/${id}/skills/${skill.id}`, { method: 'DELETE' })),
    )
    if (draft.courseId && !matchingSkill) {
      await apiRequest(`/teachers/${id}/skills`, {
        method: 'POST',
        body: JSON.stringify({ courseId: draft.courseId }),
      })
    }
    await load(true)
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/teachers/${id}`, { method: 'DELETE' })
    await load(true)
  }

  function find(id: string): Teacher | undefined {
    return teachers.value.find((teacher) => teacher.id === id)
  }

  function name(id: string): string {
    const teacher = find(id)

    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'
  }

  function countBySubject(subject: string): number {
    return teachers.value.filter((teacher) => teacher.subject === subject).length
  }

  return {
    teachers,
    loading,
    total,
    activeCount,
    load,
    create,
    update,
    remove,
    find,
    name,
    countBySubject,
  }
})
