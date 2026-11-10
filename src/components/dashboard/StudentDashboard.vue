<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarCheck,
  Clock,
  Megaphone,
  Pin,
  TrendingUp,
  Wallet,
} from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { formatCurrency, formatDate, formatShortDate } from '@/services/format'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useFeesStore } from '@/stores/fees'
import { useGradesStore } from '@/stores/grades'
import { useSettingsStore } from '@/stores/settings'
import { useTimetableStore } from '@/stores/timetable'
import type { AttendanceStatus } from '@/types'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const attendanceStore = useAttendanceStore()
const gradesStore = useGradesStore()
const feesStore = useFeesStore()
const timetableStore = useTimetableStore()
const announcementsStore = useAnnouncementsStore()

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayName = weekdays[new Date().getDay()] ?? 'Monday'

const todayLessons = computed(() =>
  timetableStore.entries
    .filter((entry) => entry.day === todayName)
    .sort((a, b) => a.period - b.period),
)

const attendanceRate = computed(() => attendanceStore.overallRate)
const averageGrade = computed(() => gradesStore.overallAverage)

const outstanding = computed(() => feesStore.outstanding)
const nextInvoice = computed(() =>
  [...feesStore.managedInvoices]
    .filter((invoice) => invoice.status !== 'paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0],
)

const recentAttendance = computed(() =>
  [...attendanceStore.records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6),
)

const attendanceTone: Record<AttendanceStatus, 'active' | 'danger' | 'warning' | 'info'> = {
  present: 'active',
  absent: 'danger',
  late: 'warning',
  excused: 'info',
}

const subjectPerformance = computed(() => {
  const bySubject = new Map<string, { total: number; count: number; className: string }>()

  gradesStore.records.forEach((record) => {
    const row = bySubject.get(record.subject) ?? {
      total: 0,
      count: 0,
      className: record.className,
    }

    row.total += record.score
    row.count += 1
    bySubject.set(record.subject, row)
  })

  return [...bySubject.entries()]
    .map(([subject, row]) => ({
      subject,
      className: row.className,
      average: Math.round(row.total / row.count),
      letter: gradesStore.letterFor(row.total / row.count),
      assessments: row.count,
    }))
    .sort((a, b) => b.average - a.average)
})

const latestAnnouncements = computed(() => announcementsStore.sorted.slice(0, 3))

const attendanceBreakdown = computed(() => {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }

  attendanceStore.records.forEach((record) => {
    counts[record.status] += 1
  })

  return counts
})

function letterTone(letter: string): 'active' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (letter === 'A') return 'active'
  if (letter === 'B') return 'info'
  if (letter === 'C') return 'warning'
  if (letter === 'D') return 'warning'

  return letter === 'F' ? 'danger' : 'neutral'
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white shadow-lg sm:p-8"
    >
      <div
        class="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl"
      />

      <div class="relative flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-xl">
          <p class="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            {{ settingsStore.settings.term }} · {{ settingsStore.settings.academicYear }}
          </p>
          <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Good to see you, {{ auth.user?.name.split(' ')[0] }}.
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-slate-300">
            Here is your day at {{ settingsStore.settings.name }} — attendance, lessons, grades, and
            fees all in one place.
          </p>

          <div class="mt-5 flex flex-wrap gap-2">
            <RouterLink
              to="/timetable"
              class="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <CalendarCheck class="h-4 w-4" />
              My timetable
            </RouterLink>
            <RouterLink
              to="/grades"
              class="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <Award class="h-4 w-4" />
              My grades
            </RouterLink>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <p class="text-xs font-medium text-slate-300">Today</p>
          <p class="mt-1 text-lg font-semibold">{{ todayName }}</p>
          <p class="mt-2 text-xs text-slate-400">
            {{ todayLessons.length }} lesson{{ todayLessons.length === 1 ? '' : 's' }} scheduled
          </p>
        </div>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Attendance rate"
        :value="`${attendanceRate}%`"
        :hint="`${attendanceStore.records.length} records this term`"
        :icon="CalendarCheck"
        tone="emerald"
      />
      <StatCard
        label="Average grade"
        :value="`${averageGrade}%`"
        :hint="`${gradesStore.records.length} assessment scores`"
        :icon="Award"
        tone="indigo"
      />
      <StatCard
        label="Outstanding fees"
        :value="formatCurrency(outstanding)"
        :hint="nextInvoice ? `Next due ${formatDate(nextInvoice.dueDate)}` : 'All invoices settled'"
        :icon="Wallet"
        tone="amber"
      />
      <StatCard
        label="Today's lessons"
        :value="todayLessons.length"
        :hint="todayLessons.length > 0 ? todayLessons[0]?.subject ?? '' : 'No lessons scheduled'"
        :icon="Clock"
        tone="sky"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <section class="card p-5 xl:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Today's schedule</h3>
            <p class="text-xs text-slate-500">Your lessons for {{ todayName }}</p>
          </div>
          <RouterLink
            to="/timetable"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Full week
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <ul v-if="todayLessons.length > 0" class="mt-4 divide-y divide-slate-100">
          <li
            v-for="lesson in todayLessons"
            :key="lesson.id"
            class="flex items-center gap-4 py-3"
          >
            <div
              class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"
            >
              <span class="text-[10px] font-semibold uppercase">P{{ lesson.period }}</span>
              <span class="text-[10px] text-indigo-500">{{ lesson.startTime?.slice(0, 5) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-800">{{ lesson.subject }}</p>
              <p class="mt-0.5 truncate text-xs text-slate-500">
                {{ lesson.className ?? 'Class' }}
                <span v-if="lesson.teacherName"> · {{ lesson.teacherName }}</span>
              </p>
            </div>
            <span
              class="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
            >
              {{ lesson.room || 'Room TBC' }}
            </span>
          </li>
        </ul>

        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
          >
            <BookOpen class="h-6 w-6" />
          </div>
          <h4 class="mt-3 text-sm font-semibold text-slate-900">No lessons today</h4>
          <p class="mt-1 max-w-xs text-sm text-slate-500">
            Enjoy the break — your full weekly timetable is always available.
          </p>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Attendance</h3>
            <p class="text-xs text-slate-500">Your recent record</p>
          </div>
          <RouterLink
            to="/attendance"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Details
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <div class="mt-4 grid grid-cols-4 gap-2 text-center">
          <div
            v-for="(count, status) in attendanceBreakdown"
            :key="status"
            class="rounded-lg bg-slate-50 px-2 py-2"
          >
            <p class="text-lg font-bold text-slate-800">{{ count }}</p>
            <p class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {{ status }}
            </p>
          </div>
        </div>

        <ul v-if="recentAttendance.length > 0" class="mt-4 space-y-2">
          <li
            v-for="record in recentAttendance"
            :key="record.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-xs font-medium text-slate-700">
                {{ record.className || 'Class' }}
              </p>
              <p class="text-[11px] text-slate-500">{{ formatDate(record.date) }}</p>
            </div>
            <BaseBadge :tone="attendanceTone[record.status]">{{ record.status }}</BaseBadge>
          </li>
        </ul>

        <p v-else class="mt-4 text-sm text-slate-500">No attendance records yet.</p>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <section class="card p-5 xl:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Subject performance</h3>
            <p class="text-xs text-slate-500">Average score across recorded assessments</p>
          </div>
          <RouterLink
            to="/grades"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            All grades
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <ul v-if="subjectPerformance.length > 0" class="mt-4 space-y-4">
          <li v-for="row in subjectPerformance" :key="row.subject">
            <div class="flex items-center justify-between gap-3 text-sm">
              <div class="min-w-0">
                <span class="font-medium text-slate-800">{{ row.subject }}</span>
                <span class="ml-2 text-xs text-slate-400">
                  {{ row.assessments }} assessment{{ row.assessments === 1 ? '' : 's' }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-sm font-semibold text-slate-700">{{ row.average }}%</span>
                <BaseBadge :tone="letterTone(row.letter)">{{ row.letter }}</BaseBadge>
              </div>
            </div>
            <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                :style="{ width: `${row.average}%` }"
              />
            </div>
          </li>
        </ul>

        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
          >
            <TrendingUp class="h-6 w-6" />
          </div>
          <h4 class="mt-3 text-sm font-semibold text-slate-900">No grades yet</h4>
          <p class="mt-1 max-w-xs text-sm text-slate-500">
            Assessment scores will appear here once your teachers publish them.
          </p>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Fees</h3>
            <p class="text-xs text-slate-500">Your billing summary</p>
          </div>
          <RouterLink
            to="/fees"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <div class="mt-4 rounded-xl bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Outstanding</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ formatCurrency(outstanding) }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ formatCurrency(feesStore.collected) }} paid · {{ feesStore.overdueCount }} overdue
          </p>
        </div>

        <div v-if="nextInvoice" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p class="text-xs font-semibold text-amber-800">Next payment</p>
          <p class="mt-0.5 truncate text-sm font-medium text-amber-900">{{ nextInvoice.title }}</p>
          <p class="mt-0.5 text-xs text-amber-700">
            {{ formatCurrency(nextInvoice.amount) }} due {{ formatDate(nextInvoice.dueDate) }}
          </p>
        </div>
        <p v-else class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          All invoices are settled. Nice work!
        </p>
      </section>
    </div>

    <section class="card p-5">
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

      <ul v-if="latestAnnouncements.length > 0" class="mt-4 divide-y divide-slate-100">
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

      <p v-else class="py-8 text-center text-sm text-slate-500">No announcements yet.</p>
    </section>
  </div>
</template>
