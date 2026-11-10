import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import { useClassesStore } from '@/stores/classes'
import type { AttendanceRecord, AttendanceStatus } from '@/types'

export interface AttendanceEntry {
  studentId: string
  status: AttendanceStatus
}

interface ApiAttendance {
  id: string
  attendanceDate: string
  status: AttendanceStatus
  enrollmentId: string | null
  classId: string | null
  className: string | null
  studentId: string | null
}

function mapRecord(record: ApiAttendance): AttendanceRecord {
  return {
    id: record.id,
    date: record.attendanceDate,
    studentId: record.studentId ?? '',
    className: record.className ?? '',
    classId: record.classId ?? undefined,
    enrollmentId: record.enrollmentId ?? undefined,
    status: record.status,
  }
}

export const useAttendanceStore = defineStore('attendance', () => {
  const records = ref<AttendanceRecord[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (records.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<ApiAttendance[]>('/attendance')
      .then((response) => {
        records.value = response.map(mapRecord)
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  function forClassDate(className: string, date: string): AttendanceRecord[] {
    return records.value.filter(
      (record) => record.className === className && record.date === date,
    )
  }

  function statusFor(studentId: string, date: string): AttendanceStatus | undefined {
    return records.value.find(
      (record) => record.studentId === studentId && record.date === date,
    )?.status
  }

  async function saveForClassDate(
    className: string,
    date: string,
    entries: AttendanceEntry[],
  ): Promise<void> {
    const classesStore = useClassesStore()
    await classesStore.load()

    const schoolClass = classesStore.classes.find((item) => item.name === className)

    if (!schoolClass) {
      throw new Error(`Class ${className} was not found`)
    }

    const enrollmentByStudent = new Map(
      (schoolClass.enrollments ?? [])
        .filter((enrollment) => enrollment.status === 'active')
        .map((enrollment) => [enrollment.student.id, enrollment]),
    )

    const apiEntries = entries
      .map((entry) => {
        const enrollment = enrollmentByStudent.get(entry.studentId)
        return enrollment
          ? { enrollmentId: enrollment.id, status: entry.status }
          : null
      })
      .filter((entry): entry is { enrollmentId: string; status: AttendanceStatus } => entry !== null)

    if (apiEntries.length === 0) return

    const saved = await apiRequest<ApiAttendance[]>('/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({
        classId: schoolClass.id,
        attendanceDate: date,
        entries: apiEntries,
      }),
    })

    const savedRecords = saved.map(mapRecord)
    records.value = [
      ...records.value.filter(
        (record) => !(record.className === className && record.date === date),
      ),
      ...savedRecords,
    ]
  }

  function rateForDate(date: string): number {
    const dayRecords = records.value.filter((record) => record.date === date)
    if (dayRecords.length === 0) return 0

    const attended = dayRecords.filter(
      (record) => record.status === 'present' || record.status === 'late',
    ).length

    return Math.round((attended / dayRecords.length) * 100)
  }

  function rateForClass(className: string): number {
    const classRecords = records.value.filter((record) => record.className === className)
    if (classRecords.length === 0) return 0

    const attended = classRecords.filter(
      (record) => record.status === 'present' || record.status === 'late',
    ).length

    return Math.round((attended / classRecords.length) * 100)
  }

  const overallRate = computed(() => {
    if (records.value.length === 0) return 0

    const attended = records.value.filter(
      (record) => record.status === 'present' || record.status === 'late',
    ).length

    return Math.round((attended / records.value.length) * 100)
  })

  const today = computed(() => new Date().toISOString().slice(0, 10))
  const todayRate = computed(() => {
    const rate = rateForDate(today.value)

    return rate > 0 ? rate : overallRate.value
  })

  return {
    records,
    loading,
    overallRate,
    today,
    todayRate,
    load,
    forClassDate,
    statusFor,
    saveForClassDate,
    rateForDate,
    rateForClass,
  }
})
