<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  Award,
  CalendarCheck,
  GraduationCap,
  Megaphone,
  Pin,
  UserPlus,
  Wallet,
} from 'lucide-vue-next'

import StatCard from '@/components/ui/StatCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import StudentDashboard from '@/components/dashboard/StudentDashboard.vue'
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  fullName,
  initials,
  percentage,
} from '@/services/format'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useFeesStore } from '@/stores/fees'
import { useGradesStore } from '@/stores/grades'
import { useSettingsStore } from '@/stores/settings'
import { useStudentsStore } from '@/stores/students'
import { useTeachersStore } from '@/stores/teachers'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const studentsStore = useStudentsStore()
const teachersStore = useTeachersStore()
const classesStore = useClassesStore()
const attendanceStore = useAttendanceStore()
const gradesStore = useGradesStore()
const feesStore = useFeesStore()
const announcementsStore = useAnnouncementsStore()

const grades = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const enrollmentByGrade = computed(() =>
  grades.map((grade) => ({
    grade,
    count: studentsStore.students.filter(
      (student) => student.grade === grade && student.status === 'active',
    ).length,
  })),
)

const maxEnrollment = computed(() =>
  Math.max(1, ...enrollmentByGrade.value.map((entry) => entry.count)),
)

const activeRate = computed(() => {
  if (studentsStore.total === 0) return 0

  return Math.round((studentsStore.activeCount / studentsStore.total) * 100)
})

const recentStudents = computed(() =>
  [...studentsStore.students].sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)).slice(0, 5),
)

const scheduledClasses = computed(() => classesStore.classes.slice(0, 4))

const totalEnrolled = computed(() =>
  classesStore.classes.reduce(
    (sum, schoolClass) => sum + studentsStore.countByClass(schoolClass.name),
    0,
  ),
)

const capacityUsage = computed(() => {
  if (classesStore.totalCapacity === 0) return 0

  return Math.min(100, Math.round((totalEnrolled.value / classesStore.totalCapacity) * 100))
})

const pinnedAnnouncements = computed(() => announcementsStore.pinned.slice(0, 2))

const latestAnnouncements = computed(() => announcementsStore.sorted.slice(0, 4))

const feeSplit = computed(() => {
  const invoices = feesStore.managedInvoices
  const paid = invoices.filter((invoice) => invoice.status === 'paid')
  const pending = invoices.filter((invoice) => invoice.status === 'pending')
  const overdue = invoices.filter((invoice) => invoice.status === 'overdue')

  return [
    {
      label: 'Paid',
      count: paid.length,
      amount: paid.reduce((sum, invoice) => sum + invoice.amount, 0),
      color: 'bg-emerald-500',
    },
    {
      label: 'Pending',
      count: pending.length,
      amount: pending.reduce((sum, invoice) => sum + invoice.amount, 0),
      color: 'bg-amber-500',
    },
    {
      label: 'Overdue',
      count: overdue.length,
      amount: overdue.reduce((sum, invoice) => sum + invoice.amount, 0),
      color: 'bg-rose-500',
    },
  ]
})

const feeTotal = computed(() => feesStore.managedInvoices.length)
</script>

<template>
  <StudentDashboard v-if="auth.isStudent" />

  <div v-else class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">
          Good to see you, {{ auth.user?.name.split(' ')[0] }}.
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Here is what is happening across {{ settingsStore.settings.name }} today.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          to="/attendance"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <CalendarCheck class="h-4 w-4" />
          Mark attendance
        </RouterLink>
        <RouterLink
          to="/students"
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <UserPlus class="h-4 w-4" />
          Manage students
        </RouterLink>
      </div>
    </div>

    <div
      v-if="pinnedAnnouncements.length > 0"
      class="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center"
    >
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white"
      >
        <Megaphone class="h-4 w-4" />
      </span>
      <div class="min-w-0 flex-1 space-y-1">
        <p
          v-for="announcement in pinnedAnnouncements"
          :key="announcement.id"
          class="flex items-center gap-2 text-sm text-slate-700"
        >
          <Pin class="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span class="truncate font-medium text-slate-800">{{ announcement.title }}</span>
          <span class="hidden shrink-0 text-xs text-slate-500 sm:inline">
            {{ formatShortDate(announcement.createdAt) }}
          </span>
        </p>
      </div>
      <RouterLink
        to="/announcements"
        class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
      >
        View all
        <ArrowUpRight class="h-3.5 w-3.5" />
      </RouterLink>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active students"
        :value="studentsStore.activeCount"
        :hint="`${studentsStore.total} total · ${activeRate}% active`"
        :icon="GraduationCap"
        tone="indigo"
      />
      <StatCard
        label="Attendance rate"
        :value="`${attendanceStore.todayRate}%`"
        :hint="`Today · ${attendanceStore.today}`"
        :icon="CalendarCheck"
        tone="emerald"
      />
      <StatCard
        label="Average grade"
        :value="`${gradesStore.overallAverage}%`"
        :hint="`${gradesStore.records.length} assessment scores`"
        :icon="Award"
        tone="amber"
      />
      <StatCard
        label="Fee collection"
        :value="`${feesStore.collectionRate}%`"
        :hint="`${formatCurrency(feesStore.collected)} collected`"
        :icon="Wallet"
        tone="sky"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <section class="card p-5 xl:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Enrollment by grade</h3>
            <p class="text-xs text-slate-500">Active students per grade level</p>
          </div>
          <BaseBadge tone="info">{{ studentsStore.activeCount }} active</BaseBadge>
        </div>

        <div class="mt-6 space-y-4">
          <div v-for="entry in enrollmentByGrade" :key="entry.grade">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">{{ entry.grade }}</span>
              <span class="text-slate-500">{{ entry.count }} students</span>
            </div>
            <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                :style="{ width: `${(entry.count / maxEnrollment) * 100}%` }"
              />
            </div>
          </div>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl bg-slate-50 p-4">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">Capacity usage</span>
              <span class="text-slate-500">{{ capacityUsage }}%</span>
            </div>
            <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                :style="{ width: `${capacityUsage}%` }"
              />
            </div>
            <p class="mt-1.5 text-xs text-slate-500">
              {{ totalEnrolled }} / {{ classesStore.totalCapacity }} seats filled
            </p>
          </div>

          <div class="rounded-xl bg-slate-50 p-4">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">Fee collection</span>
              <span class="text-slate-500">{{ feesStore.collectionRate }}%</span>
            </div>
            <div class="mt-2 flex h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                v-for="row in feeSplit"
                :key="row.label"
                :class="['h-full', row.color]"
                :style="{ width: `${percentage(row.count, feeTotal)}%` }"
              />
            </div>
            <p class="mt-1.5 text-xs text-slate-500">
              {{ formatCurrency(feesStore.outstanding) }} outstanding ·
              {{ feesStore.overdueCount }} overdue
            </p>
          </div>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Class schedule</h3>
            <p class="text-xs text-slate-500">Upcoming class blocks</p>
          </div>
          <RouterLink
            to="/classes"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <ul class="mt-4 divide-y divide-slate-100">
          <li v-for="schoolClass in scheduledClasses" :key="schoolClass.id" class="py-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-800">
                  {{ schoolClass.name }}
                  <span class="font-normal text-slate-400">· {{ schoolClass.room }}</span>
                </p>
                <p class="mt-0.5 text-xs text-slate-500">
                  {{ teachersStore.name(schoolClass.teacherId) }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
              >
                {{ schoolClass.schedule }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <section class="card p-5 xl:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Latest announcements</h3>
            <p class="text-xs text-slate-500">News shared with the school community</p>
          </div>
          <RouterLink
            to="/announcements"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <ul class="mt-4 divide-y divide-slate-100">
          <li
            v-for="announcement in latestAnnouncements"
            :key="announcement.id"
            class="flex items-start gap-3 py-3"
          >
            <span
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"
            >
              <Pin v-if="announcement.pinned" class="h-4 w-4 text-indigo-500" />
              <Megaphone v-else class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-800">{{ announcement.title }}</p>
              <p class="mt-0.5 line-clamp-1 text-xs text-slate-500">{{ announcement.body }}</p>
            </div>
            <span class="shrink-0 text-xs text-slate-400">
              {{ formatShortDate(announcement.createdAt) }}
            </span>
          </li>
        </ul>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Fee status</h3>
            <p class="text-xs text-slate-500">Invoice value by status</p>
          </div>
          <RouterLink
            to="/fees"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Manage
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <div class="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            v-for="row in feeSplit"
            :key="row.label"
            :class="['h-full', row.color]"
            :style="{ width: `${percentage(row.count, feeTotal)}%` }"
          />
        </div>

        <ul class="mt-4 space-y-3">
          <li
            v-for="row in feeSplit"
            :key="row.label"
            class="flex items-center justify-between text-sm"
          >
            <span class="flex items-center gap-2 text-slate-600">
              <span :class="['h-2.5 w-2.5 rounded-full', row.color]" />
              {{ row.label }}
              <span class="text-xs text-slate-400">({{ row.count }})</span>
            </span>
            <span class="font-medium text-slate-700">{{ formatCurrency(row.amount) }}</span>
          </li>
        </ul>

        <p class="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {{ formatCurrency(feesStore.totalBilled) }} billed across {{ feeTotal }} invoices
        </p>
      </section>
    </div>

    <section class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Recent enrollments</h3>
          <p class="text-xs text-slate-500">The latest students added to the school</p>
        </div>
        <RouterLink
          to="/students"
          class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          All students
          <ArrowUpRight class="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" class="px-5 py-3 font-semibold">Student</th>
              <th scope="col" class="px-5 py-3 font-semibold">Grade</th>
              <th scope="col" class="px-5 py-3 font-semibold">Class</th>
              <th scope="col" class="px-5 py-3 font-semibold">Enrolled</th>
              <th scope="col" class="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="student in recentStudents" :key="student.id" class="hover:bg-slate-50">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                  >
                    {{ initials(student.firstName, student.lastName) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-800">
                      {{ fullName(student.firstName, student.lastName) }}
                    </p>
                    <p class="truncate text-xs text-slate-500">{{ student.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 text-slate-600">{{ student.grade }}</td>
              <td class="px-5 py-3 text-slate-600">{{ student.className }}</td>
              <td class="px-5 py-3 text-slate-600">{{ formatDate(student.enrolledAt) }}</td>
              <td class="px-5 py-3">
                <BaseBadge :tone="student.status === 'active' ? 'active' : 'inactive'">
                  {{ student.status }}
                </BaseBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
