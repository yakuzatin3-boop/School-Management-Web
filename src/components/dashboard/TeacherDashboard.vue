<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  Pin,
  Plus,
  QrCode,
  Users,
} from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import StatCard from '@/components/ui/StatCard.vue'
import ClassCard from '@/components/classes/ClassCard.vue'
import { formatShortDate } from '@/services/format'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useClassStore } from '@/stores/classes'
import { useGradesStore } from '@/stores/grades'
import { useSettingsStore } from '@/stores/settings'
import { useTimetableStore } from '@/stores/timetable'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const classStore = useClassStore()
const attendanceStore = useAttendanceStore()
const gradesStore = useGradesStore()
const timetableStore = useTimetableStore()
const announcementsStore = useAnnouncementsStore()

const myClasses = computed(() => {
  const teacherId = auth.user?.id
  if (!teacherId) return []

  return classStore.classes.filter((schoolClass) => !schoolClass.teacherId || schoolClass.teacherId === teacherId)
})

const myClassIds = computed(() => new Set(myClasses.value.map((schoolClass) => schoolClass.id)))
const myClassNames = computed(() => new Set(myClasses.value.map((schoolClass) => schoolClass.name)))

const totalStudents = computed(() =>
  myClasses.value.reduce((sum, schoolClass) => sum + (schoolClass.studentCount ?? 0), 0),
)

const myAttendanceRecords = computed(() =>
  attendanceStore.records.filter(
    (record) =>
      (record.classId && myClassIds.value.has(record.classId)) ||
      myClassNames.value.has(record.className),
  ),
)

const myAttendanceRate = computed(() => {
  if (myAttendanceRecords.value.length === 0) return 0

  const attended = myAttendanceRecords.value.filter(
    (record) => record.status === 'present' || record.status === 'late',
  ).length

  return Math.round((attended / myAttendanceRecords.value.length) * 100)
})

const myGradesRecords = computed(() =>
  gradesStore.records.filter(
    (record) =>
      (record.classId && myClassIds.value.has(record.classId)) ||
      myClassNames.value.has(record.className),
  ),
)

const myGradesCount = computed(() => myGradesRecords.value.length)

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayName = weekdays[new Date().getDay()] ?? 'Monday'
const todayLessons = computed(() =>
  timetableStore.entries
    .filter(
      (entry) =>
        entry.day === todayName &&
        (myClassIds.value.has(entry.classId) || myClassNames.value.has(entry.className ?? '')),
    )
    .sort((a, b) => a.period - b.period),
)

const featuredClasses = computed(() => myClasses.value.slice(0, 4))
const latestAnnouncements = computed(() => announcementsStore.sorted.slice(0, 3))
const pinnedAnnouncements = computed(() => announcementsStore.pinned.slice(0, 2))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-emerald-600">Teacher</p>
        <h2 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {{ auth.user?.name.split(' ')[0] }}.
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Your classes, attendance, and teaching tools for {{ settingsStore.settings.name }}.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          to="/teacher/classes/create"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Plus class="h-4 w-4" />
          Create class
        </RouterLink>
        <RouterLink
          to="/teacher/classes"
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <QrCode class="h-4 w-4" />
          My classes & QR
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
        label="My classes"
        :value="myClasses.length"
        hint="Classes assigned to you"
        :icon="BookOpen"
        tone="indigo"
      />
      <StatCard
        label="My students"
        :value="totalStudents"
        hint="Active enrollments"
        :icon="Users"
        tone="emerald"
      />
      <StatCard
        label="Attendance rate"
        :value="`${myAttendanceRate}%`"
        hint="Across your recorded sessions"
        :icon="CalendarCheck"
        tone="sky"
      />
      <StatCard
        label="Grade records"
        :value="myGradesCount"
        hint="Assessment scores for your classes"
        :icon="ClipboardList"
        tone="amber"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <section class="card p-5 xl:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">My classes</h3>
            <p class="text-xs text-slate-500">Quick access to registration QR and attendance</p>
          </div>
          <RouterLink
            to="/teacher/classes"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <div v-if="featuredClasses.length > 0" class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="schoolClass in featuredClasses" :key="schoolClass.id" class="flex flex-col gap-2">
            <ClassCard :school-class="schoolClass" :to="`/teacher/classes/${schoolClass.id}`" :show-teacher="false" />
            <div class="grid grid-cols-2 gap-2">
              <RouterLink :to="`/teacher/classes/${schoolClass.id}/attendance`">
                <button
                  type="button"
                  class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Attendance
                </button>
              </RouterLink>
              <RouterLink :to="`/teacher/classes/${schoolClass.id}/report`">
                <button
                  type="button"
                  class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Report
                </button>
              </RouterLink>
            </div>
          </div>
        </div>

        <div v-else class="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 text-center">
          <BookOpen class="h-8 w-8 text-slate-300" />
          <p class="mt-3 text-sm font-semibold text-slate-900">No classes yet</p>
          <p class="mt-1 text-sm text-slate-500">Create a class to generate a registration QR and start tracking attendance.</p>
          <RouterLink to="/teacher/classes/create" class="mt-4">
            <span class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <Plus class="h-4 w-4" /> Create class
            </span>
          </RouterLink>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Today's lessons</h3>
            <p class="text-xs text-slate-500">{{ todayName }}</p>
          </div>
          <RouterLink
            to="/timetable"
            class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Timetable
            <ArrowUpRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <ul v-if="todayLessons.length > 0" class="mt-4 space-y-2">
          <li
            v-for="lesson in todayLessons"
            :key="lesson.id"
            class="rounded-lg border border-slate-100 px-3 py-2"
          >
            <p class="text-sm font-semibold text-slate-800">{{ lesson.subject }}</p>
            <p class="text-xs text-slate-500">
              {{ lesson.className ?? 'Class' }} · {{ lesson.room || 'Room TBC' }}
            </p>
            <p class="mt-1 text-[11px] font-medium text-indigo-600">
              Period {{ lesson.period }}<span v-if="lesson.startTime"> · {{ lesson.startTime.slice(0, 5) }}</span>
            </p>
          </li>
        </ul>

        <div v-else class="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No lessons scheduled for today.
        </div>

        <div class="mt-5 space-y-2">
          <RouterLink to="/grades" class="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Open gradebook
          </RouterLink>
          <RouterLink to="/students" class="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            View students
          </RouterLink>
        </div>
      </section>
    </div>

    <section class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Latest announcements</h3>
          <p class="text-xs text-slate-500">Updates relevant to staff and classes</p>
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
          <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Pin v-if="announcement.pinned" class="h-4 w-4 text-indigo-500" />
            <Megaphone v-else class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-medium text-slate-800">{{ announcement.title }}</p>
              <BaseBadge v-if="announcement.pinned" tone="info">Pinned</BaseBadge>
            </div>
            <p class="mt-0.5 line-clamp-1 text-xs text-slate-500">{{ announcement.body }}</p>
          </div>
          <span class="shrink-0 text-xs text-slate-400">{{ formatShortDate(announcement.createdAt) }}</span>
        </li>
      </ul>
      <p v-else class="py-8 text-center text-sm text-slate-500">No announcements yet.</p>
    </section>
  </div>
</template>
