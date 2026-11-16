import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import {
  checkInAttendance,
  endAttendanceSession,
  getActiveAttendanceSession,
  getAttendanceReport,
  getAttendanceSession,
  refreshAttendanceSession,
  startAttendanceSession,
  updateAttendanceStatus,
} from '@/services/classManagement'
import { useClassesStore } from '@/stores/classes'
import type {
  AttendanceCheckInResult,
  AttendanceParticipant,
  AttendanceRecord,
  AttendanceReport,
  AttendanceSession,
  AttendanceStatus,
} from '@/types'

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

  const session = ref<AttendanceSession | null>(null)
  const participants = ref<AttendanceParticipant[]>([])
  const sessionLoading = ref(false)
  const sessionError = ref('')
  const report = ref<AttendanceReport | null>(null)
  const reportLoading = ref(false)
  const reportError = ref('')

  const sessionCounts = computed(() => {
    const counts: AttendanceReport['counts'] = { present: 0, late: 0, absent: 0 }

    participants.value.forEach((participant) => {
      if (
        participant.status === 'present' ||
        participant.status === 'late' ||
        participant.status === 'absent'
      ) {
        counts[participant.status] += 1
      }
    })

    return counts
  })

  function messageFor(cause: unknown, fallback: string): string {
    return cause instanceof Error ? cause.message : fallback
  }

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

  async function startSession(
    classId: string,
    durationSeconds = 45,
  ): Promise<AttendanceSession> {
    sessionLoading.value = true
    sessionError.value = ''

    try {
      const started = await startAttendanceSession(classId, durationSeconds)
      session.value = started
      await loadSession(classId, started.id, true)

      return started
    } catch (cause) {
      sessionError.value = messageFor(cause, 'Unable to start attendance.')
      throw cause
    } finally {
      sessionLoading.value = false
    }
  }

  async function resumeSession(classId: string): Promise<AttendanceSession | null> {
    sessionLoading.value = true
    sessionError.value = ''

    try {
      const active = await getActiveAttendanceSession(classId)
      if (!active) {
        session.value = null
        participants.value = []
        return null
      }

      session.value = active
      await loadSession(classId, active.id, true)

      return active
    } catch (cause) {
      sessionError.value = messageFor(cause, 'Unable to load the attendance session.')
      throw cause
    } finally {
      sessionLoading.value = false
    }
  }

  async function loadSession(
    classId: string,
    sessionId: string,
    silent = false,
  ): Promise<void> {
    if (!silent) sessionLoading.value = true

    try {
      const detail = await getAttendanceSession(classId, sessionId)
      session.value = detail.session
      participants.value = detail.participants
      sessionError.value = ''
    } catch (cause) {
      sessionError.value = messageFor(cause, 'Unable to refresh the live attendance list.')
      if (!silent) throw cause
    } finally {
      if (!silent) sessionLoading.value = false
    }
  }

  async function refreshSession(classId: string): Promise<AttendanceSession | null> {
    if (!session.value) return null

    const refreshed = await refreshAttendanceSession(classId, session.value.id)
    session.value = refreshed

    return refreshed
  }

  async function endSession(classId: string): Promise<void> {
    if (!session.value) return

    await endAttendanceSession(classId, session.value.id)
    session.value = null
    participants.value = []
  }

  async function checkIn(sessionId: string, token: string): Promise<AttendanceCheckInResult> {
    return checkInAttendance(sessionId, token)
  }

  async function setParticipantStatus(
    classId: string,
    studentId: string,
    status: AttendanceStatus,
  ): Promise<void> {
    if (!session.value) return

    const previous = participants.value
    participants.value = participants.value.map((participant) =>
      participant.studentId === studentId
        ? {
            ...participant,
            status,
            checkedInAt:
              status === 'absent'
                ? null
                : (participant.checkedInAt ?? new Date().toISOString()),
          }
        : participant,
    )

    try {
      const updated = await updateAttendanceStatus(
        classId,
        session.value.id,
        studentId,
        status,
      )
      if (updated) {
        participants.value = participants.value.map((participant) =>
          participant.studentId === studentId ? updated : participant,
        )
      }
    } catch (cause) {
      participants.value = previous
      throw cause
    }
  }

  async function loadReport(classId: string, date: string): Promise<void> {
    reportLoading.value = true
    reportError.value = ''

    try {
      report.value = await getAttendanceReport(classId, date)
    } catch (cause) {
      reportError.value = messageFor(cause, 'Unable to load the attendance report.')
      throw cause
    } finally {
      reportLoading.value = false
    }
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
    session,
    participants,
    sessionLoading,
    sessionError,
    sessionCounts,
    report,
    reportLoading,
    reportError,
    load,
    startSession,
    resumeSession,
    loadSession,
    refreshSession,
    endSession,
    checkIn,
    setParticipantStatus,
    loadReport,
    forClassDate,
    statusFor,
    saveForClassDate,
    rateForDate,
    rateForClass,
  }
})
