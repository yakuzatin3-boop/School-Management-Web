<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BookOpen, Clock, MapPin, UserRound, Users } from 'lucide-vue-next'

import type { SchoolClass } from '@/types'

const props = withDefaults(
  defineProps<{
    schoolClass: SchoolClass
    to?: string
    showTeacher?: boolean
  }>(),
  { to: '', showTeacher: true },
)

const courseTones: Record<string, string> = {
  'Web Backend': 'bg-sky-50 text-sky-700 ring-sky-600/20',
  'Web Frontend': 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Networking: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  Database: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Cybersecurity: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  'Mobile Development': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'DevOps / Cloud': 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  Other: 'bg-slate-100 text-slate-700 ring-slate-500/20',
}

const dayShort: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
}

const tag = computed(() => (props.to ? RouterLink : 'div'))
const courseName = computed(() => props.schoolClass.courseName ?? 'Other')
const courseTone = computed(() => courseTones[courseName.value] ?? courseTones.Other)

const studentCount = computed(
  () =>
    props.schoolClass.studentCount ??
    props.schoolClass.enrollments?.filter((enrollment) => enrollment.status === 'active').length ??
    0,
)
const capacity = computed(() => props.schoolClass.maxStudents ?? props.schoolClass.capacity ?? 0)
const occupancy = computed(() =>
  capacity.value > 0 ? Math.min(100, Math.round((studentCount.value / capacity.value) * 100)) : 0,
)

const location = computed(() => {
  const schoolClass = props.schoolClass
  const parts = [
    schoolClass.building && schoolClass.building !== 'Unassigned' ? schoolClass.building : '',
    schoolClass.floor ? `Floor ${schoolClass.floor}` : '',
    schoolClass.roomNumber ?? (schoolClass.room !== 'Unassigned' ? schoolClass.room : ''),
  ].filter(Boolean)

  return parts.join(' · ') || 'Location not set'
})

const schedule = computed(() => {
  const schoolClass = props.schoolClass

  if (schoolClass.scheduleDays?.length) {
    const days = schoolClass.scheduleDays.map((day) => dayShort[day] ?? day).join(', ')
    const time =
      schoolClass.startTime && schoolClass.endTime
        ? ` · ${schoolClass.startTime.slice(0, 5)}–${schoolClass.endTime.slice(0, 5)}`
        : ''

    return `${days}${time}`
  }

  return schoolClass.schedule || 'No schedule'
})
</script>

<template>
  <component
    :is="tag"
    v-bind="to ? { to } : {}"
    class="card flex h-full flex-col p-5 transition hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
        >
          <BookOpen class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h3 class="truncate text-lg font-semibold text-slate-900">{{ schoolClass.name }}</h3>
          <span
            :class="[
              'mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
              courseTone,
            ]"
          >
            {{ courseName }}
          </span>
        </div>
      </div>
    </div>

    <dl class="mt-5 space-y-2.5 text-sm">
      <div v-if="showTeacher" class="flex items-center gap-2 text-slate-600">
        <UserRound class="h-4 w-4 shrink-0 text-slate-400" />
        <span class="truncate">{{ schoolClass.teacherName || 'Teacher not assigned' }}</span>
      </div>
      <div class="flex items-center gap-2 text-slate-600">
        <MapPin class="h-4 w-4 shrink-0 text-slate-400" />
        <span class="truncate">{{ location }}</span>
      </div>
      <div class="flex items-center gap-2 text-slate-600">
        <Clock class="h-4 w-4 shrink-0 text-slate-400" />
        <span class="truncate">{{ schedule }}</span>
      </div>
    </dl>

    <div class="mt-auto pt-5">
      <div class="flex items-center justify-between text-xs">
        <span class="flex items-center gap-1.5 font-medium text-slate-600">
          <Users class="h-3.5 w-3.5 text-slate-400" />
          {{ studentCount }} student{{ studentCount === 1 ? '' : 's' }}
        </span>
        <span v-if="capacity > 0" class="text-slate-500">{{ studentCount }} / {{ capacity }}</span>
        <span v-else class="text-slate-400">No capacity limit</span>
      </div>
      <div v-if="capacity > 0" class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full bg-indigo-500 transition-all duration-500"
          :style="{ width: `${occupancy}%` }"
        />
      </div>
    </div>
  </component>
</template>
