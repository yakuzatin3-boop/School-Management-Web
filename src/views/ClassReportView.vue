<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Users,
} from 'lucide-vue-next'

import AttendanceTable from '@/components/classes/AttendanceTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { downloadCsv } from '@/services/csv'
import { useAttendanceStore } from '@/stores/attendance'
import { useClassStore } from '@/stores/classes'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const classStore = useClassStore()
const attendanceStore = useAttendanceStore()
const toast = useToastStore()

const selectedClassId = ref(String(route.params.id))
const date = ref(new Date().toISOString().slice(0, 10))
const classesLoading = ref(true)
const classesError = ref('')

const report = computed(() => attendanceStore.report)
const counts = computed(() => report.value?.counts ?? { present: 0, late: 0, absent: 0 })
const selectedClass = computed(() => classStore.find(selectedClassId.value))
const rows = computed(() => report.value?.rows ?? [])

const classOptions = computed(() => {
  const options = classStore.classes.map((schoolClass) => ({
    id: schoolClass.id,
    label: schoolClass.name,
  }))

  if (selectedClassId.value && !options.some((option) => option.id === selectedClassId.value)) {
    options.unshift({
      id: selectedClassId.value,
      label: selectedClass.value?.name ?? 'Selected class',
    })
  }

  return options
})

function formatCheckIn(value: string | null): string {
  if (!value) return ''

  const checkIn = new Date(value)
  if (Number.isNaN(checkIn.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(checkIn)
}

async function loadClasses(): Promise<void> {
  classesLoading.value = true
  classesError.value = ''

  try {
    await classStore.load()
  } catch (cause) {
    classesError.value = cause instanceof Error ? cause.message : 'Unable to load classes.'
  } finally {
    classesLoading.value = false
  }
}

async function loadReport(): Promise<void> {
  if (!selectedClassId.value || !date.value) return

  try {
    await attendanceStore.loadReport(selectedClassId.value, date.value)
  } catch {
    // The store exposes the API message through reportError.
  }
}

function exportCsv(): void {
  if (!report.value || report.value.rows.length === 0) {
    toast.error('There are no attendance rows to export.')
    return
  }

  const className = selectedClass.value?.name ?? report.value.className ?? selectedClassId.value
  const filename = `attendance-${className}-${date.value}.csv`
  downloadCsv(
    filename.replace(/[^a-z0-9._-]+/gi, '-'),
    ['Student', 'Email', 'Status', 'Check-in time'],
    report.value.rows.map((row) => [
      row.name,
      row.email,
      row.status,
      formatCheckIn(row.checkedInAt),
    ]),
  )
  toast.success('Attendance report exported.')
}

function retry(): void {
  void loadReport()
}

watch([selectedClassId, date], loadReport)
watch(
  () => route.params.id,
  (id) => {
    selectedClassId.value = String(id)
  },
)

onMounted(async () => {
  await Promise.all([loadClasses(), loadReport()])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <RouterLink :to="`/teacher/classes/${selectedClassId}`">
          <BaseButton variant="ghost" size="sm" aria-label="Back to class">
            <ArrowLeft class="h-4 w-4" />
          </BaseButton>
        </RouterLink>
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Attendance report</h2>
          <p class="mt-1 text-sm text-slate-500">
            Filter by class and date, review the summary, and export the register.
          </p>
        </div>
      </div>

      <BaseButton
        variant="secondary"
        :disabled="attendanceStore.reportLoading || rows.length === 0"
        @click="exportCsv"
      >
        <Download class="h-4 w-4" />
        Export CSV
      </BaseButton>
    </div>

    <div class="card p-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto] lg:items-end">
        <div>
          <label for="report-class" class="field-label">Class</label>
          <select
            id="report-class"
            v-model="selectedClassId"
            class="field-input"
            :disabled="classesLoading"
          >
            <option v-for="option in classOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div>
          <label for="report-date" class="field-label">Date</label>
          <input id="report-date" v-model="date" type="date" class="field-input" />
        </div>

        <div class="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays class="h-4 w-4 text-slate-400" />
          {{ date }}
        </div>
      </div>

      <p v-if="classesError" class="mt-3 text-xs font-medium text-rose-600">
        {{ classesError }}
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="card p-4">
        <p class="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <span class="h-2 w-2 rounded-full bg-emerald-500" />
          Present
        </p>
        <p class="mt-1 text-2xl font-bold text-emerald-600">{{ counts.present }}</p>
      </div>
      <div class="card p-4">
        <p class="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <span class="h-2 w-2 rounded-full bg-amber-500" />
          Late
        </p>
        <p class="mt-1 text-2xl font-bold text-amber-600">{{ counts.late }}</p>
      </div>
      <div class="card p-4">
        <p class="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <span class="h-2 w-2 rounded-full bg-rose-500" />
          Absent
        </p>
        <p class="mt-1 text-2xl font-bold text-rose-600">{{ counts.absent }}</p>
      </div>
    </div>

    <div
      v-if="attendanceStore.reportError"
      class="card flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertCircle class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">Unable to load the report</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ attendanceStore.reportError }}</p>
      <BaseButton variant="secondary" class="mt-5" @click="retry">Try again</BaseButton>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-slate-900">
            {{ selectedClass?.name ?? report?.className ?? 'Class register' }}
          </h3>
          <p class="text-xs text-slate-500">
            {{ rows.length }} student{{ rows.length === 1 ? '' : 's' }} · {{ date }}
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Users class="h-3.5 w-3.5" />
          {{ counts.present + counts.late + counts.absent }} records
        </span>
      </div>

      <AttendanceTable
        v-if="attendanceStore.reportLoading || rows.length > 0"
        :rows="rows"
        :loading="attendanceStore.reportLoading"
        empty-message="No attendance was recorded for this class on the selected date."
      />

      <div v-else class="card flex flex-col items-center justify-center px-6 py-10 text-center">
        <div
          class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        >
          <FileSpreadsheet class="h-5 w-5" />
        </div>
        <p class="mt-3 text-sm font-semibold text-slate-900">Nothing to export yet</p>
        <p class="mt-1 max-w-sm text-sm text-slate-500">
          Start an attendance session for this class, or choose another date.
        </p>
        <RouterLink :to="`/teacher/classes/${selectedClassId}/attendance`" class="mt-4">
          <BaseButton size="sm">
            <BarChart3 class="h-4 w-4" />
            Open live attendance
          </BaseButton>
        </RouterLink>
      </div>
    </template>
  </div>
</template>
