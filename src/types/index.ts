export type Status = 'active' | 'inactive' | 'suspended' | 'graduated' | 'on_leave'

export type Gender = 'male' | 'female' | 'other'

export interface Student {
  id: string
  studentNumber?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: Gender
  grade: string
  className: string
  classId?: string
  status: Status
  enrolledAt: string
}

export interface Teacher {
  id: string
  teacherNumber?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  subject: string
  courseIds?: string[]
  status: Status
  hiredAt: string
}

export const COURSE_NAMES = [
  'Web Backend',
  'Web Frontend',
  'Networking',
  'Database',
  'Cybersecurity',
  'Mobile Development',
  'DevOps / Cloud',
  'Other',
] as const

export type CourseName = (typeof COURSE_NAMES)[number]

export const BUILDING_NAMES = ['Building A', 'Building B', 'Building C', 'Building D'] as const

export type BuildingName = (typeof BUILDING_NAMES)[number]

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type WeekdayName = (typeof WEEKDAY_NAMES)[number]

export interface SchoolClass {
  id: string
  classCode?: string
  courseId?: string
  name: string
  grade: string
  teacherId: string
  room: string
  capacity: number
  schedule: string
  status?: Status
  enrollments?: ClassEnrollment[]
  courseName?: CourseName
  building?: string
  floor?: string
  roomNumber?: string
  scheduleDays?: WeekdayName[]
  startTime?: string
  endTime?: string
  startDate?: string
  endDate?: string
  maxStudents?: number
  registrationToken?: string
  teacherName?: string
  studentCount?: number
}

export interface ManagedClassDraft {
  name: string
  course: CourseName
  building: string
  floor: string
  roomNumber?: string
  scheduleDays: WeekdayName[]
  startTime: string
  endTime: string
  startDate: string
  endDate: string
  maxStudents?: number
  teacherId?: string
}

export interface AttendanceSession {
  id: string
  classId: string
  className?: string
  token: string
  startedAt: string
  expiresAt: string
  durationSeconds: number
  status: 'active' | 'ended'
}

export interface AttendanceParticipant {
  studentId: string
  name: string
  email: string
  status: AttendanceStatus
  checkedInAt: string | null
  attendanceId?: string
}

export interface AttendanceReportRow {
  studentId: string
  name: string
  email: string
  status: AttendanceStatus
  checkedInAt: string | null
}

export interface AttendanceReport {
  classId: string
  className: string
  date: string
  rows: AttendanceReportRow[]
  counts: Record<'present' | 'late' | 'absent', number>
}

export interface AttendanceCheckInResult {
  status: AttendanceStatus
  classId?: string
  className?: string
  checkedInAt?: string
  message?: string
}

export interface ClassEnrollment {
  id: string
  status: string
  enrolledAt: string
  student: Pick<Student, 'id' | 'firstName' | 'lastName' | 'email' | 'status'> & {
    studentNumber: string
  }
}

export interface Course {
  id: string
  name: string
  description: string | null
  classCount: number
  teacherSkillCount: number
}

export type RoleKey = 'admin' | 'teacher' | 'student'

export interface User {
  id: string
  name: string
  email: string
  role: 'Administrator' | 'Teacher' | 'Student'
  roleKey: RoleKey
}

export interface Credentials {
  email: string
  password: string
}

export type EntityFormMode = 'create' | 'edit'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceRecord {
  id: string
  date: string
  studentId: string
  className: string
  classId?: string
  enrollmentId?: string
  status: AttendanceStatus
}

export interface GradeRecord {
  id: string
  studentId: string
  classId?: string
  className: string
  subject: string
  assessment: string
  score: number
  term: string
  updatedAt: string
}

export type FeeStatus = 'paid' | 'pending' | 'overdue'

export interface FeeInvoice {
  id: string
  studentId: string
  title: string
  amount: number
  dueDate: string
  status: FeeStatus
  paidAt?: string
}

export type Audience = 'all' | 'students' | 'teachers'

export interface Announcement {
  id: string
  title: string
  body: string
  audience: Audience
  pinned: boolean
  createdAt: string
  author: string
}

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export interface TimetableEntry {
  id: string
  day: Weekday
  period: number
  classId: string
  className?: string
  subject: string
  teacherId: string
  teacherName?: string
  room: string
  startTime?: string
  endTime?: string
  roomId?: string | null
}

export interface SchoolSettings {
  name: string
  email: string
  phone: string
  address: string
  academicYear: string
  term: string
  principal: string
}
