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
