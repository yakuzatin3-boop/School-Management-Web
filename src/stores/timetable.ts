import { ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { TimetableEntry } from '@/types'

export type TimetableDraft = Omit<TimetableEntry, 'id'>

interface ApiTimetableEntry {
  id: string
  classId: string
  className: string
  day: TimetableEntry['day']
  period: number
  subject: string
  teacherId: string | null
  teacherName: string | null
  room: string | null
  startTime: string | null
  endTime: string | null
}

function mapEntry(entry: ApiTimetableEntry): TimetableEntry {
  return {
    id: entry.id,
    classId: entry.classId,
    className: entry.className,
    day: entry.day,
    period: entry.period,
    subject: entry.subject,
    teacherId: entry.teacherId ?? '',
    teacherName: entry.teacherName ?? undefined,
    room: entry.room ?? '',
    startTime: entry.startTime ?? undefined,
    endTime: entry.endTime ?? undefined,
  }
}

export const useTimetableStore = defineStore('timetable', () => {
  const entries = ref<TimetableEntry[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (entries.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<ApiTimetableEntry[]>('/timetable')
      .then((response) => {
        entries.value = response.map(mapEntry)
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  function forClass(classId: string): TimetableEntry[] {
    return entries.value
      .filter((entry) => entry.classId === classId)
      .sort((a, b) => a.period - b.period)
  }

  function forCell(classId: string, day: string, period: number): TimetableEntry | undefined {
    return entries.value.find(
      (entry) => entry.classId === classId && entry.day === day && entry.period === period,
    )
  }

  async function create(draft: TimetableDraft): Promise<TimetableEntry> {
    const response = await apiRequest<ApiTimetableEntry>('/timetable', {
      method: 'POST',
      body: JSON.stringify(draft),
    })
    const entry = mapEntry(response)
    const clash = forCell(entry.classId, entry.day, entry.period)

    entries.value = [
      ...entries.value.filter(
        (item) => item.id !== clash?.id && item.id !== entry.id,
      ),
      entry,
    ]

    return entry
  }

  async function update(id: string, draft: TimetableDraft): Promise<void> {
    const response = await apiRequest<ApiTimetableEntry>(`/timetable/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
    const entry = mapEntry(response)

    entries.value = entries.value.map((item) => (item.id === id ? entry : item))
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/timetable/${id}`, { method: 'DELETE' })
    entries.value = entries.value.filter((entry) => entry.id !== id)
  }

  return { entries, loading, load, forClass, forCell, create, update, remove }
})
