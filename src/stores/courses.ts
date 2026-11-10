import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { Course } from '@/types'

export const useCoursesStore = defineStore('courses', () => {
  const courses = ref<Course[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  const total = computed(() => courses.value.length)

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (courses.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<Course[]>('/courses')
      .then((response) => {
        courses.value = response
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  async function create(draft: Pick<Course, 'name' | 'description'>): Promise<Course> {
    const course = await apiRequest<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(draft),
    })
    courses.value = [course, ...courses.value]
    return course
  }

  async function update(id: string, draft: Partial<Pick<Course, 'name' | 'description'>>): Promise<void> {
    const course = await apiRequest<Course>(`/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
    courses.value = courses.value.map((item) => (item.id === id ? course : item))
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/courses/${id}`, { method: 'DELETE' })
    courses.value = courses.value.filter((course) => course.id !== id)
  }

  function find(id: string): Course | undefined {
    return courses.value.find((course) => course.id === id)
  }

  return { courses, loading, total, load, create, update, remove, find }
})
