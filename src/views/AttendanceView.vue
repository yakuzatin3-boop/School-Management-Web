<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CalendarCheck, Check, Clock, Save, UserRound, X } from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatDate, fullName, initials } from '@/services/format'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useStudentsStore } from '@/stores/students'
import { useToastStore } from '@/stores/toast'
import type { AttendanceStatus } from '@/types'

const attendanceStore = useAttendanceStore()
const auth = useAuthStore()
const classesStore = useClassesStore()
const studentsStore = useStudentsStore()
const toast = useToastStore()

const selectedClass = ref(classesStore.classes[0]?.name ?? '')
const date = ref(new Date().toISOString().slice(0, 10))
const statuses = reactive<Record<string, AttendanceStatus>>({})
const studentClassFilter = ref('all')

const roster = computed(() =>
  studentsStore.students.filter(
    (student) => student.className === selectedClass.value && student.status === 'active',
  ),
)

const statusOptions: Array<{
  value: AttendanceStatus
  label: string
  short: string
  activeClass: string
  idleClass: string
}> = [
  {
    value: 'present',
    label: 'Present',
    short: 'P',
    activeClass: 'border-emerald-600 bg-emerald-600 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700',
  },
  {
    value: 'absent',
    label: 'Absent',
    short: 'A',
    activeClass: 'border-rose-600 bg-rose-600 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700',
  },
  {
    value: 'late',
    label: 'Late',
    short: 'L',
    activeClass: 'border-amber-500 bg-amber-500 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700',
  },
  {
    value: 'excused',
    label: 'Excused',
    short: 'E',
    activeClass: 'border-sky-600 bg-sky-600 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700',
  },
]

const counts = computed(() => {
  const summary: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }

  roster.value.forEach((student) => {
    const status = statuses[student.id]
    if (status) summary[status] += 1
  })

  return summary
})

function loadRoster(): void {
  Object.keys(statuses).forEach((key) => {
    delete statuses[key]
  })

  roster.value.forEach((student) => {
    statuses[student.id] = attendanceStore.statusFor(student.id, date.value) ?? 'present'
  })
}

function setStatus(studentId: string, status: AttendanceStatus): void {
  statuses[studentId] = status
}

function markAll(status: AttendanceStatus): void {
  roster.value.forEach((student) => {
    statuses[student.id] = status
  })
}

function save(): void {
  if (roster.value.length === 0) return

  attendanceStore
    .saveForClassDate(
      selectedClass.value,
      date.value,
      roster.value.map((student) => ({
        studentId: student.id,
        status: statuses[student.id] ?? 'present',
      })),
    )
    .then(() => {
      toast.success(`Attendance saved for Class ${selectedClass.value}.`)
    })
    .catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save attendance.')
    })
}

function statusFor(studentId: string): AttendanceStatus {
  return statuses[studentId] ?? 'present'
}

const studentRecords = computed(() =>
  [...attendanceStore.records].sort((a, b) => b.date.localeCompare(a.date)),
)

const studentClasses = computed(() =>
  [...new Set(studentRecords.value.map((record) => record.className).filter(Boolean))].sort(),
)

const filteredStudentRecords = computed(() => {
  if (studentClassFilter.value === 'all') return studentRecords.value

  return studentRecords.value.filter((record) => record.className === studentClassFilter.value)
})

const studentBreakdown = computed(() => {
  const summary: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }

  studentRecords.value.forEach((record) => {
    summary[record.status] += 1
  })

  return summary
})

function attendanceTone(status: AttendanceStatus): 'active' | 'danger' | 'warning' | 'info' {
  if (status === 'present') return 'active'
  if (status === 'absent') return 'danger'
  if (status === 'late') return 'warning'

  return 'info'
}

onMounted(async () => {
  if (auth.isStudent) {
    await attendanceStore.load()
    return
  }

  await Promise.all([
    studentsStore.load(),
    classesStore.load(),
    attendanceStore.load(),
  ])

  if (!selectedClass.value) {
    selectedClass.value = classesStore.classes[0]?.name ?? ''
  }

  loadRoster()
})
watch([selectedClass, date], loadRoster)
</script>

<template>
  <div class="space-y-6">
    <template v-if="auth.isStudent">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">My attendance</h2>
          <p class="mt-1 text-sm text-slate-500">
            Review your attendance history and keep track of every class.
          </p>
        </div>
        <BaseBadge tone="info">{{ attendanceStore.overallRate }}% overall</BaseBadge>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Present</p>
          <p class="mt-1 text-2xl font-bold text-emerald-600">{{ studentBreakdown.present }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Absent</p>
          <p class="mt-1 text-2xl font-bold text-rose-600">{{ studentBreakdown.absent }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Late</p>
          <p class="mt-1 text-2xl font-bold text-amber-600">{{ studentBreakdown.late }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Excused</p>
          <p class="mt-1 text-2xl font-bold text-sky-600">{{ studentBreakdown.excused }}</p>
        </div>
      </div>

      <div class="card p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Attendance history</h3>
            <p class="text-xs text-slate-500">
              {{ filteredStudentRecords.length }} record{{
                filteredStudentRecords.length === 1 ? '' : 's'
              }}
            </p>
          </div>
          <select v-model="studentClassFilter" class="field-input sm:w-56" aria-label="Filter by class">
            <option value="all">All classes</option>
            <option v-for="className in studentClasses" :key="className" :value="className">
              {{ className }}
            </option>
          </select>
        </div>

        <ul v-if="filteredStudentRecords.length > 0" class="mt-4 divide-y divide-slate-100">
          <li
            v-for="record in filteredStudentRecords"
            :key="record.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-800">
                {{ record.className || 'Class' }}
              </p>
              <p class="text-xs text-slate-500">{{ formatDate(record.date) }}</p>
            </div>
            <BaseBadge :tone="attendanceTone(record.status)">{{ record.status }}</BaseBadge>
          </li>
        </ul>

        <div v-else class="flex flex-col items-center justify-center py-14 text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
          >
            <CalendarCheck class="h-6 w-6" />
          </div>
          <h3 class="mt-4 text-sm font-semibold text-slate-900">No attendance records yet</h3>
          <p class="mt-1 max-w-sm text-sm text-slate-500">
            Records will appear here once your teachers mark the class register.
          </p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Attendance</h2>
        <p class="mt-1 text-sm text-slate-500">
          Mark daily attendance for a class and review the summary before saving.
        </p>
      </div>
      <BaseButton :disabled="roster.length === 0" @click="save">
        <Save class="h-4 w-4" />
        Save attendance
      </BaseButton>
    </div>

    <div class="card p-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="attendance-class" class="field-label">Class</label>
          <select id="attendance-class" v-model="selectedClass" class="field-input">
            <option
              v-for="schoolClass in classesStore.classes"
              :key="schoolClass.id"
              :value="schoolClass.name"
            >
              {{ schoolClass.name }} · {{ schoolClass.grade }}
            </option>
          </select>
        </div>
        <div>
          <label for="attendance-date" class="field-label">Date</label>
          <input id="attendance-date" v-model="date" type="date" class="field-input" />
        </div>
        <div class="sm:col-span-2">
          <p class="field-label">Mark everyone</p>
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="secondary" size="sm" @click="markAll('present')">
              <Check class="h-3.5 w-3.5" />
              All present
            </BaseButton>
            <BaseButton variant="secondary" size="sm" @click="markAll('absent')">
              <X class="h-3.5 w-3.5" />
              All absent
            </BaseButton>
            <BaseButton variant="secondary" size="sm" @click="markAll('late')">
              <Clock class="h-3.5 w-3.5" />
              All late
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Present</p>
        <p class="mt-1 text-2xl font-bold text-emerald-600">{{ counts.present }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Absent</p>
        <p class="mt-1 text-2xl font-bold text-rose-600">{{ counts.absent }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Late</p>
        <p class="mt-1 text-2xl font-bold text-amber-600">{{ counts.late }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Excused</p>
        <p class="mt-1 text-2xl font-bold text-sky-600">{{ counts.excused }}</p>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Class register</h3>
          <p class="text-xs text-slate-500">
            {{ roster.length }} active student{{ roster.length === 1 ? '' : 's' }} in Class
            {{ selectedClass }}
          </p>
        </div>
        <span class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          {{ date }}
        </span>
      </div>

      <ul v-if="roster.length > 0" class="divide-y divide-slate-100">
        <li
          v-for="student in roster"
          :key="student.id"
          class="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
            >
              {{ initials(student.firstName, student.lastName) }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-800">
                {{ fullName(student.firstName, student.lastName) }}
              </p>
              <p class="truncate text-xs text-slate-500">{{ student.email }}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              :class="[
                'min-w-[72px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                statusFor(student.id) === option.value ? option.activeClass : option.idleClass,
              ]"
              :aria-pressed="statusFor(student.id) === option.value"
              @click="setStatus(student.id, option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </li>
      </ul>

      <div v-else class="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        >
          <UserRound class="h-6 w-6" />
        </div>
        <h3 class="mt-4 text-sm font-semibold text-slate-900">No active students in this class</h3>
        <p class="mt-1 max-w-sm text-sm text-slate-500">
          Add students to Class {{ selectedClass }} from the Students page, then return here to mark
          attendance.
        </p>
        <RouterLink
          to="/students"
          class="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <CalendarCheck class="h-4 w-4" />
          Go to students
        </RouterLink>
      </div>
    </div>
    </template>
  </div>
</template>
