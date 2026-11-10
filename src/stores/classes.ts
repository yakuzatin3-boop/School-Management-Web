import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { ClassEnrollment, SchoolClass } from '@/types'

interface ApiSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: { id: string; name: string; roomCode: string; capacity: number } | null
}

interface ApiClass {
  id: string
  classCode: string
  name: string
  status: 'active' | 'inactive'
  course: { id: string; name: string } | null
  teacher: { id: string } | null
  schedules: ApiSchedule[]
}

export interface ClassDraft {
  classCode?: string
  name: string
  courseId?: string
  teacherId?: string | null
  status?: string
}

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function gradeFromName(name: string): string {
  const match = name.match(/(?:grade\s*)?(\d{1,2})/i)

  return match ? `Grade ${match[1]}` : 'Unassigned'
}

function mapClass(apiClass: ApiClass, enrollments: ClassEnrollment[]): SchoolClass {
  const schedules = apiClass.schedules ?? []
  const firstRoom = schedules.find((schedule) => schedule.room)?.room

  return {
    id: apiClass.id,
    classCode: apiClass.classCode,
    courseId: apiClass.course?.id,
    name: apiClass.name,
    grade: gradeFromName(apiClass.name),
    teacherId: apiClass.teacher?.id ?? '',
    room: firstRoom?.name ?? firstRoom?.roomCode ?? 'Unassigned',
    capacity: firstRoom?.capacity ?? 0,
    schedule: schedules
      .map((schedule) => `${weekdayNames[schedule.dayOfWeek - 1]} ${schedule.startTime.slice(0, 5)}`)
      .join(', ') || 'No schedule',
    status: apiClass.status,
    enrollments,
  }
}

export const useClassesStore = defineStore('classes', () => {
  const classes = ref<SchoolClass[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  const total = computed(() => classes.value.length)
  const totalCapacity = computed(() =>
    classes.value.reduce((sum, schoolClass) => sum + schoolClass.capacity, 0),
  )

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (classes.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<ApiClass[]>('/classes')
      .then(async (response) => {
        const rosters = await Promise.all(
          response.map((schoolClass) =>
            apiRequest<ClassEnrollment[]>(`/classes/${schoolClass.id}/students`),
          ),
        )
        classes.value = response.map((schoolClass, index) =>
          mapClass(schoolClass, rosters[index] ?? []),
        )
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  async function create(draft: ClassDraft): Promise<SchoolClass> {
    const response = await apiRequest<ApiClass>('/classes', {
      method: 'POST',
      body: JSON.stringify({
        classCode: draft.classCode ?? draft.name,
        name: draft.name,
        courseId: draft.courseId,
        teacherId: draft.teacherId || null,
        status: draft.status ?? 'active',
      }),
    })
    await load(true)
    return classes.value.find((schoolClass) => schoolClass.id === response.id) ?? mapClass(response, [])
  }

  async function update(id: string, draft: ClassDraft): Promise<void> {
    await apiRequest(`/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        classCode: draft.classCode,
        name: draft.name,
        courseId: draft.courseId,
        teacherId: draft.teacherId,
        status: draft.status,
      }),
    })
    await load(true)
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/classes/${id}`, { method: 'DELETE' })
    await load(true)
  }

  function find(id: string): SchoolClass | undefined {
    return classes.value.find((schoolClass) => schoolClass.id === id)
  }

  return { classes, loading, total, totalCapacity, load, create, update, remove, find }
})
