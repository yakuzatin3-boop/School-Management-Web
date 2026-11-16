<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, Clock, RefreshCw, UserRound } from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { AttendanceParticipant, AttendanceStatus } from '@/types'

const props = withDefaults(
  defineProps<{
    rows: AttendanceParticipant[]
    editable?: boolean
    loading?: boolean
    error?: string
    emptyMessage?: string
  }>(),
  {
    editable: false,
    loading: false,
    error: '',
    emptyMessage: 'No students are enrolled in this class yet.',
  },
)

const emit = defineEmits<{
  'update-status': [studentId: string, status: AttendanceStatus]
  retry: []
}>()

const statusOptions: Array<{
  value: AttendanceStatus
  label: string
  activeClass: string
  idleClass: string
}> = [
  {
    value: 'present',
    label: 'Present',
    activeClass: 'border-emerald-600 bg-emerald-600 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700',
  },
  {
    value: 'late',
    label: 'Late',
    activeClass: 'border-amber-500 bg-amber-500 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700',
  },
  {
    value: 'absent',
    label: 'Absent',
    activeClass: 'border-rose-600 bg-rose-600 text-white',
    idleClass: 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700',
  },
]

const sortedRows = computed(() => [...props.rows].sort((a, b) => a.name.localeCompare(b.name)))

function initialsFor(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function statusTone(status: AttendanceStatus): 'active' | 'warning' | 'danger' | 'info' {
  if (status === 'present') return 'active'
  if (status === 'late') return 'warning'
  if (status === 'absent') return 'danger'

  return 'info'
}

function formatTime(value: string | null): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}
</script>

<template>
  <div class="card overflow-hidden">
    <div
      v-if="loading"
      class="divide-y divide-slate-100"
      aria-busy="true"
      aria-label="Loading attendance"
    >
      <div v-for="index in 4" :key="index" class="flex items-center gap-4 px-5 py-4">
        <div class="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
        <div class="flex-1 space-y-2">
          <div class="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
          <div class="h-3 w-56 animate-pulse rounded bg-slate-100" />
        </div>
        <div class="h-7 w-24 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertCircle class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">Could not load attendance</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ error }}</p>
      <BaseButton variant="secondary" size="sm" class="mt-5" @click="emit('retry')">
        <RefreshCw class="h-4 w-4" />
        Try again
      </BaseButton>
    </div>

    <div
      v-else-if="sortedRows.length === 0"
      class="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <UserRound class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">No students yet</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ emptyMessage }}</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th
              scope="col"
              class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Student
            </th>
            <th
              scope="col"
              class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Status
            </th>
            <th
              scope="col"
              class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Check-in time
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <tr
            v-for="row in sortedRows"
            :key="row.studentId"
            class="transition hover:bg-slate-50/70"
          >
            <td class="whitespace-nowrap px-5 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                >
                  {{ initialsFor(row.name) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-800">{{ row.name }}</p>
                  <p class="truncate text-xs text-slate-500">{{ row.email }}</p>
                </div>
              </div>
            </td>

            <td class="whitespace-nowrap px-5 py-4">
              <div v-if="editable" class="flex flex-wrap gap-1.5">
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'min-w-[68px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                    row.status === option.value ? option.activeClass : option.idleClass,
                  ]"
                  :aria-pressed="row.status === option.value"
                  @click="emit('update-status', row.studentId, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <BaseBadge v-else :tone="statusTone(row.status)">{{ row.status }}</BaseBadge>
            </td>

            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
              <span class="inline-flex items-center gap-1.5">
                <Clock class="h-3.5 w-3.5 text-slate-400" />
                {{ formatTime(row.checkedInAt) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
