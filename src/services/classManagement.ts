import { ApiError, apiRequest } from '@/services/api'
import {
  COURSE_NAMES,
  WEEKDAY_NAMES,
  type AttendanceCheckInResult,
  type AttendanceParticipant,
  type AttendanceReport,
  type AttendanceReportRow,
  type AttendanceSession,
  type AttendanceStatus,
  type ClassEnrollment,
  type CourseName,
  type ManagedClassDraft,
  type SchoolClass,
  type WeekdayName,
} from '@/types'

interface ApiRoom {
  id?: string
  name?: string
  roomCode?: string
  capacity?: number
}

interface ApiSchedule {
  id?: string
  dayOfWeek?: number
  days?: string[]
  startTime?: string
  endTime?: string
  room?: ApiRoom | null
}

interface ApiCourse {
  id: string
  name: string
}

interface ApiTeacher {
  id: string
  firstName?: string
  lastName?: string
  email?: string
}

export interface ApiClass {
  id: string
  classCode?: string
  name: string
  status?: 'active' | 'inactive'
  course?: ApiCourse | string | null
  courseId?: string
  teacher?: ApiTeacher | null
  teacherId?: string
  building?: string | null
  floor?: number | string | null
  roomNumber?: string | null
  room?: ApiRoom | null
  schedules?: ApiSchedule[]
  schedule?: string | ApiSchedule[] | null
  scheduleDays?: string[]
  startTime?: string
  endTime?: string
  startDate?: string
  endDate?: string
  maxStudents?: number
  capacity?: number
  registrationToken?: string | null
  studentCount?: number
  enrollments?: ClassEnrollment[]
}

export interface ClassRegistrationResult {
  enrollmentId?: string
  status?: string
  message?: string
}

export interface ApiAttendanceSession {
  id: string
  classId?: string
  className?: string
  token: string
  startedAt?: string
  expiresAt?: string
  durationSeconds?: number
  status?: 'active' | 'ended'
}

export interface ApiAttendanceParticipant {
  id?: string
  studentId?: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  status?: AttendanceStatus
  checkedInAt?: string | null
  attendanceId?: string
}

export interface ApiAttendanceSessionDetail {
  session?: ApiAttendanceSession
  participants?: ApiAttendanceParticipant[]
  attendance?: ApiAttendanceParticipant[]
  classId?: string
}

export interface ApiAttendanceReport {
  classId?: string
  className?: string
  date?: string
  rows?: Array<ApiAttendanceParticipant & { studentId: string }>
  records?: Array<ApiAttendanceParticipant & { studentId: string }>
  counts?: Partial<Record<'present' | 'late' | 'absent', number>>
}

function gradeFromName(name: string): string {
  const match = name.match(/(?:grade\s*)?(\d{1,2})/i)

  return match ? `Grade ${match[1]}` : 'Unassigned'
}

function toCourseName(value: string | undefined): CourseName {
  return COURSE_NAMES.includes(value as CourseName) ? (value as CourseName) : 'Other'
}

function normalizeDays(days: string[] | undefined): WeekdayName[] {
  const valid = (days ?? []).filter((day): day is WeekdayName =>
    WEEKDAY_NAMES.includes(day as WeekdayName),
  )

  return [...new Set(valid)]
}

function scheduleDays(apiClass: ApiClass, schedules: ApiSchedule[]): WeekdayName[] {
  if (apiClass.scheduleDays?.length) return normalizeDays(apiClass.scheduleDays)

  const days = schedules.flatMap((schedule) => {
    if (schedule.days?.length) return schedule.days
    if (!schedule.dayOfWeek) return []

    const day = WEEKDAY_NAMES[schedule.dayOfWeek - 1]
    return day ? [day] : []
  })

  return normalizeDays(days)
}

function formatSchedule(days: WeekdayName[], startTime?: string, endTime?: string): string {
  if (days.length === 0) return 'No schedule'

  const time =
    startTime && endTime
      ? ` ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`
      : startTime
        ? ` ${startTime.slice(0, 5)}`
        : ''

  return `${days.join(', ')}${time}`
}

export function mapApiClass(
  apiClass: ApiClass,
  enrollments: ClassEnrollment[] = apiClass.enrollments ?? [],
): SchoolClass {
  const schedules =
    apiClass.schedules ?? (Array.isArray(apiClass.schedule) ? apiClass.schedule : [])
  const firstRoom = schedules.find((schedule) => schedule.room)?.room ?? apiClass.room
  const days = scheduleDays(apiClass, schedules)
  const startTime = apiClass.startTime ?? schedules[0]?.startTime
  const endTime = apiClass.endTime ?? schedules[0]?.endTime
  const course = typeof apiClass.course === 'string' ? apiClass.course : apiClass.course?.name
  const teacherName =
    [apiClass.teacher?.firstName, apiClass.teacher?.lastName].filter(Boolean).join(' ') ||
    apiClass.teacher?.email ||
    ''
  const schedule =
    typeof apiClass.schedule === 'string' && apiClass.schedule.trim()
      ? apiClass.schedule
      : formatSchedule(days, startTime, endTime)
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'active')

  return {
    id: apiClass.id,
    classCode: apiClass.classCode,
    courseId:
      apiClass.courseId ?? (typeof apiClass.course === 'object' ? apiClass.course?.id : undefined),
    courseName: toCourseName(course),
    name: apiClass.name,
    grade: gradeFromName(apiClass.name),
    teacherId: apiClass.teacherId ?? apiClass.teacher?.id ?? '',
    teacherName,
    room:
      apiClass.roomNumber ??
      firstRoom?.name ??
      firstRoom?.roomCode ??
      apiClass.room?.name ??
      'Unassigned',
    roomNumber: apiClass.roomNumber ?? undefined,
    building: apiClass.building ?? 'Unassigned',
    floor: apiClass.floor === null || apiClass.floor === undefined ? '' : String(apiClass.floor),
    capacity: apiClass.maxStudents ?? apiClass.capacity ?? firstRoom?.capacity ?? 0,
    maxStudents: apiClass.maxStudents,
    schedule,
    scheduleDays: days,
    startTime,
    endTime,
    startDate: apiClass.startDate,
    endDate: apiClass.endDate,
    status: apiClass.status ?? 'active',
    registrationToken: apiClass.registrationToken ?? undefined,
    studentCount: apiClass.studentCount ?? activeEnrollments.length,
    enrollments,
  }
}

function classList(response: ApiClass[] | { classes: ApiClass[] }): ApiClass[] {
  return Array.isArray(response) ? response : (response.classes ?? [])
}

export async function listClasses(): Promise<ApiClass[]> {
  return classList(await apiRequest<ApiClass[] | { classes: ApiClass[] }>('/classes'))
}

export async function getClass(id: string): Promise<ApiClass> {
  return apiRequest<ApiClass>(`/classes/${id}`)
}

export async function listMyClasses(): Promise<ApiClass[]> {
  return classList(await apiRequest<ApiClass[] | { classes: ApiClass[] }>('/students/me/classes'))
}

export async function createManagedClass(draft: ManagedClassDraft): Promise<ApiClass> {
  const classCode =
    draft.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'CLASS'

  return apiRequest<ApiClass>('/classes', {
    method: 'POST',
    body: JSON.stringify({
      classCode,
      name: draft.name.trim(),
      course: draft.course,
      courseName: draft.course,
      building: draft.building,
      floor: Number(draft.floor),
      roomNumber: draft.roomNumber?.trim() || null,
      scheduleDays: draft.scheduleDays,
      startTime: draft.startTime,
      endTime: draft.endTime,
      startDate: draft.startDate,
      endDate: draft.endDate,
      maxStudents: draft.maxStudents ?? null,
      teacherId: draft.teacherId ?? null,
      // Kept in the payload so the existing class API can persist the same schedule.
      schedules: draft.scheduleDays.map((day) => ({
        dayOfWeek: WEEKDAY_NAMES.indexOf(day) + 1,
        startTime: draft.startTime,
        endTime: draft.endTime,
      })),
    }),
  })
}

export async function regenerateRegistrationToken(
  classId: string,
): Promise<{ token: string; expiresAt?: string }> {
  const response = await apiRequest<{
    token?: string
    registrationToken?: string
    expiresAt?: string
  }>(`/classes/${classId}/registration-token`, { method: 'POST' })
  const token = response.token ?? response.registrationToken

  if (!token) throw new Error('The API did not return a registration token.')

  return { token, expiresAt: response.expiresAt }
}

export async function previewClassJoin(classId: string, token: string): Promise<ApiClass> {
  const response = await apiRequest<ApiClass | { class: ApiClass }>(
    `/classes/${classId}/join?token=${encodeURIComponent(token)}`,
  )

  return 'class' in response ? response.class : response
}

export async function registerForClass(
  classId: string,
  token: string,
): Promise<ClassRegistrationResult> {
  return apiRequest<ClassRegistrationResult>(`/classes/${classId}/register`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

function mapAttendanceSession(
  session: ApiAttendanceSession,
  fallbackClassId = '',
): AttendanceSession {
  return {
    id: session.id,
    classId: session.classId ?? fallbackClassId,
    className: session.className,
    token: session.token,
    startedAt: session.startedAt ?? new Date().toISOString(),
    expiresAt: session.expiresAt ?? new Date(Date.now() + 45_000).toISOString(),
    durationSeconds: session.durationSeconds ?? 45,
    status: session.status ?? 'active',
  }
}

function mapAttendanceParticipant(participant: ApiAttendanceParticipant): AttendanceParticipant {
  const name =
    participant.name?.trim() ||
    [participant.firstName, participant.lastName].filter(Boolean).join(' ') ||
    participant.email ||
    'Student'

  return {
    studentId: participant.studentId ?? participant.id ?? '',
    name,
    email: participant.email ?? '',
    status: participant.status ?? 'absent',
    checkedInAt: participant.checkedInAt ?? null,
    attendanceId: participant.attendanceId,
  }
}

export async function startAttendanceSession(
  classId: string,
  durationSeconds = 45,
): Promise<AttendanceSession> {
  const response = await apiRequest<ApiAttendanceSession>(`/classes/${classId}/attendance/start`, {
    method: 'POST',
    body: JSON.stringify({ durationSeconds }),
  })

  return mapAttendanceSession(response, classId)
}

export async function getActiveAttendanceSession(
  classId: string,
): Promise<AttendanceSession | null> {
  try {
    const response = await apiRequest<ApiAttendanceSession | undefined>(
      `/classes/${classId}/attendance/active`,
    )

    return response ? mapAttendanceSession(response, classId) : null
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) return null

    throw cause
  }
}

export async function getAttendanceSession(
  classId: string,
  sessionId: string,
): Promise<{ session: AttendanceSession; participants: AttendanceParticipant[] }> {
  const response = await apiRequest<ApiAttendanceSessionDetail>(
    `/classes/${classId}/attendance/sessions/${sessionId}`,
  )
  const rawSession = response.session ?? (response as ApiAttendanceSession)
  const rawParticipants = response.participants ?? response.attendance ?? []

  return {
    session: mapAttendanceSession(rawSession, classId),
    participants: rawParticipants.map(mapAttendanceParticipant),
  }
}

export async function refreshAttendanceSession(
  classId: string,
  sessionId: string,
): Promise<AttendanceSession> {
  const response = await apiRequest<ApiAttendanceSession>(
    `/classes/${classId}/attendance/sessions/${sessionId}/refresh`,
    { method: 'POST' },
  )

  return mapAttendanceSession(response, classId)
}

export async function endAttendanceSession(classId: string, sessionId: string): Promise<void> {
  await apiRequest(`/classes/${classId}/attendance/sessions/${sessionId}/end`, {
    method: 'POST',
  })
}

export async function checkInAttendance(
  sessionId: string,
  token: string,
): Promise<AttendanceCheckInResult> {
  return apiRequest<AttendanceCheckInResult>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({ sessionId, token }),
  })
}

export async function updateAttendanceStatus(
  classId: string,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): Promise<AttendanceParticipant | undefined> {
  const response = await apiRequest<ApiAttendanceParticipant | undefined>(
    `/classes/${classId}/attendance/sessions/${sessionId}/students/${studentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )

  return response ? mapAttendanceParticipant(response) : undefined
}

function reportRow(row: ApiAttendanceParticipant & { studentId: string }): AttendanceReportRow {
  const participant = mapAttendanceParticipant(row)

  return {
    studentId: participant.studentId,
    name: participant.name,
    email: participant.email,
    status: participant.status,
    checkedInAt: participant.checkedInAt,
  }
}

function countReportRows(rows: AttendanceReportRow[]): AttendanceReport['counts'] {
  const counts: AttendanceReport['counts'] = { present: 0, late: 0, absent: 0 }

  rows.forEach((row) => {
    if (row.status === 'present' || row.status === 'late' || row.status === 'absent') {
      counts[row.status] += 1
    }
  })

  return counts
}

export async function getAttendanceReport(
  classId: string,
  date: string,
): Promise<AttendanceReport> {
  const response = await apiRequest<ApiAttendanceReport>(
    `/classes/${classId}/attendance/report?date=${encodeURIComponent(date)}`,
  )
  const rows = (response.rows ?? response.records ?? []).map(reportRow)

  return {
    classId: response.classId ?? classId,
    className: response.className ?? '',
    date: response.date ?? date,
    rows,
    counts: response.counts
      ? {
          present: response.counts.present ?? 0,
          late: response.counts.late ?? 0,
          absent: response.counts.absent ?? 0,
        }
      : countReportRows(rows),
  }
}
