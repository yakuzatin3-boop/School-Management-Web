import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import {
  createManagedClass,
  getClass,
  listClasses,
  listMyClasses,
  mapApiClass,
  previewClassJoin,
  regenerateRegistrationToken,
  registerForClass,
  type ClassRegistrationResult,
} from '@/services/classManagement'
import type { ManagedClassDraft, SchoolClass } from '@/types'

export interface ClassDraft {
  classCode?: string
  name: string
  courseId?: string
  teacherId?: string | null
  status?: string
}

export const useClassesStore = defineStore('classes', () => {
  const classes = ref<SchoolClass[]>([])
  const loading = ref(false)
  const myClassesLoading = ref(false)
  let loadPromise: Promise<void> | null = null

  const total = computed(() => classes.value.length)
  const totalCapacity = computed(() =>
    classes.value.reduce((sum, schoolClass) => sum + schoolClass.capacity, 0),
  )

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (classes.value.length && !force) return

    loading.value = true
    loadPromise = listClasses()
      .then(async (response) => {
        const rosters = await Promise.all(
          response.map((schoolClass) =>
            apiRequest<SchoolClass['enrollments']>(`/classes/${schoolClass.id}/students`),
          ),
        )
        classes.value = response.map((schoolClass, index) =>
          mapApiClass(schoolClass, rosters[index] ?? []),
        )
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  async function loadMine(): Promise<void> {
    myClassesLoading.value = true
    try {
      const response = await listMyClasses()
      classes.value = response.map((schoolClass) => mapApiClass(schoolClass))
    } finally {
      myClassesLoading.value = false
    }
  }

  async function loadOne(id: string): Promise<SchoolClass> {
    const response = await getClass(id)
    const roster = await apiRequest<SchoolClass['enrollments']>(`/classes/${id}/students`).catch(
      () => response.enrollments,
    )
    const schoolClass = mapApiClass(response, roster ?? response.enrollments ?? [])
    const index = classes.value.findIndex((item) => item.id === id)
    classes.value =
      index === -1
        ? [...classes.value, schoolClass]
        : classes.value.map((item) => (item.id === id ? schoolClass : item))

    return schoolClass
  }

  async function create(draft: ClassDraft): Promise<SchoolClass> {
    const response = await apiRequest<{ id: string }>('/classes', {
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

    const created = classes.value.find((schoolClass) => schoolClass.id === response.id)
    if (!created) throw new Error('The class was created but could not be reloaded.')

    return created
  }

  async function createManaged(draft: ManagedClassDraft): Promise<SchoolClass> {
    const response = await createManagedClass(draft)
    const schoolClass = mapApiClass(response)
    classes.value = [schoolClass, ...classes.value.filter((item) => item.id !== schoolClass.id)]

    return schoolClass
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

  async function regenerateToken(id: string): Promise<string> {
    const { token } = await regenerateRegistrationToken(id)
    classes.value = classes.value.map((schoolClass) =>
      schoolClass.id === id ? { ...schoolClass, registrationToken: token } : schoolClass,
    )

    return token
  }

  async function ensureToken(id: string): Promise<string> {
    const schoolClass = find(id)
    if (schoolClass?.registrationToken) return schoolClass.registrationToken

    return regenerateToken(id)
  }

  async function previewJoin(classId: string, token: string): Promise<SchoolClass> {
    return mapApiClass(await previewClassJoin(classId, token))
  }

  async function register(classId: string, token: string): Promise<ClassRegistrationResult> {
    return registerForClass(classId, token)
  }

  function find(id: string): SchoolClass | undefined {
    return classes.value.find((schoolClass) => schoolClass.id === id)
  }

  return {
    classes,
    loading,
    myClassesLoading,
    total,
    totalCapacity,
    load,
    loadMine,
    loadOne,
    create,
    createManaged,
    update,
    remove,
    regenerateToken,
    ensureToken,
    previewJoin,
    register,
    find,
  }
})

// The feature spec refers to this store as useClassStore; keep both names for
// existing pages that already import useClassesStore.
export const useClassStore = useClassesStore
