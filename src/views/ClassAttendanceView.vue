<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Users,
} from 'lucide-vue-next'

import AttendanceTable from '@/components/classes/AttendanceTable.vue'
import QrDisplay from '@/components/classes/QrDisplay.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useClassStore } from '@/stores/classes'
import { useToastStore } from '@/stores/toast'
import type { AttendanceStatus } from '@/types'

const route = useRoute()
const classStore = useClassStore()
const attendanceStore = useAttendanceStore()
const toast = useToastStore()

const classId = computed(() => String(route.params.id))
const schoolClass = computed(() => classStore.find(classId.value))
const session = computed(() => attendanceStore.session)
const participants = computed(() => attendanceStore.participants)
const counts = computed(() => attendanceStore.sessionCounts)

const loading = ref(true)
const loadError = ref('')
const starting = ref(false)
const ending = ref(false)
const refreshing = ref(false)
const polling = ref(false)
const countdown = ref(0)

let countdownTimer: number | null = null
let pollTimer: number | null = null
let refreshBlockedUntil = 0

const attendanceUrl = computed(() => {
  if (!session.value) return ''

  const url = new URL('/student/scan', window.location.origin)
  url.searchParams.set('session', session.value.id)
  url.searchParams.set('classId', classId.value)
  url.searchParams.set('token', session.value.token)

  return url.toString()
})

const countdownLabel = computed(() => {
  if (!session.value) return ''
  if (countdown.value <= 0) return 'Refreshing QR…'

  return `QR refreshes in ${countdown.value}s`
})

function stopTimers(): void {
  if (countdownTimer !== null) window.clearInterval(countdownTimer)
  if (pollTimer !== null) window.clearInterval(pollTimer)
  countdownTimer = null
  pollTimer = null
}

function tick(): void {
  if (!session.value) {
    countdown.value = 0
    return
  }

  const expiresAt = new Date(session.value.expiresAt).getTime()
  countdown.value = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))

  if (countdown.value <= 0 && Date.now() > refreshBlockedUntil && !refreshing.value) {
    void refreshQr()
  }
}

function startTimers(): void {
  stopTimers()
  tick()

  countdownTimer = window.setInterval(tick, 1000)
  pollTimer = window.setInterval(() => {
    if (!session.value || polling.value) return

    polling.value = true
    attendanceStore.loadSession(classId.value, session.value.id, true).finally(() => {
      polling.value = false
    })
  }, 5000)
}

async function refreshQr(): Promise<void> {
  if (!session.value || refreshing.value) return

  refreshing.value = true
  try {
    await attendanceStore.refreshSession(classId.value)
    refreshBlockedUntil = 0
    tick()
  } catch (cause) {
    refreshBlockedUntil = Date.now() + 5000
    toast.error(cause instanceof Error ? cause.message : 'Unable to refresh the attendance QR.')
  } finally {
    refreshing.value = false
  }
}

async function startAttendance(): Promise<void> {
  starting.value = true

  try {
    await attendanceStore.startSession(classId.value, 45)
    startTimers()
    toast.success('Attendance started. The QR code refreshes every 45 seconds.')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to start attendance.')
  } finally {
    starting.value = false
  }
}

async function endAttendance(): Promise<void> {
  ending.value = true

  try {
    await attendanceStore.endSession(classId.value)
    stopTimers()
    toast.success('Attendance session ended.')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to end the session.')
  } finally {
    ending.value = false
  }
}

async function updateStatus(studentId: string, status: AttendanceStatus): Promise<void> {
  try {
    await attendanceStore.setParticipantStatus(classId.value, studentId, status)
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to update the student status.')
  }
}

function retrySession(): void {
  if (!session.value) return

  void attendanceStore.loadSession(classId.value, session.value.id).catch(() => {
    // The store exposes the error through sessionError.
  })
}

async function loadPage(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    await classStore.loadOne(classId.value)
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : 'Unable to load this class.'
    loading.value = false
    return
  }

  try {
    const active = await attendanceStore.resumeSession(classId.value)
    if (active) startTimers()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to resume attendance.')
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)
onBeforeUnmount(stopTimers)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <RouterLink :to="`/teacher/classes/${classId}`">
          <BaseButton variant="ghost" size="sm" aria-label="Back to class">
            <ArrowLeft class="h-4 w-4" />
          </BaseButton>
        </RouterLink>
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Live attendance</h2>
          <p class="mt-1 text-sm text-slate-500">
            {{ schoolClass?.name ?? 'Class' }} · students scan the rotating QR to check in.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <RouterLink :to="`/teacher/classes/${classId}/report`">
          <BaseButton variant="secondary">
            <BarChart3 class="h-4 w-4" />
            Report
          </BaseButton>
        </RouterLink>
        <BaseButton v-if="session" variant="danger" :disabled="ending" @click="endAttendance">
          <Loader2 v-if="ending" class="h-4 w-4 animate-spin" />
          <Square v-else class="h-4 w-4" />
          End session
        </BaseButton>
      </div>
    </div>

    <div v-if="loading" class="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div class="card h-96 animate-pulse" />
      <div class="card h-96 animate-pulse" />
    </div>

    <div
      v-else-if="loadError"
      class="card flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertCircle class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">Unable to open attendance</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ loadError }}</p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" @click="loadPage">Try again</BaseButton>
        <RouterLink to="/teacher/classes">
          <BaseButton>Back to classes</BaseButton>
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <div
        v-if="!session"
        class="card flex flex-col items-center justify-center px-6 py-16 text-center"
      >
        <div
          class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
        >
          <CalendarCheck class="h-7 w-7" />
        </div>
        <h3 class="mt-4 text-lg font-semibold text-slate-900">Start an attendance session</h3>
        <p class="mt-1 max-w-md text-sm text-slate-500">
          A short-lived QR code will appear. It refreshes every 45 seconds so only students in the
          room can check in.
        </p>
        <BaseButton class="mt-5" :disabled="starting" @click="startAttendance">
          <Loader2 v-if="starting" class="h-4 w-4 animate-spin" />
          <Play v-else class="h-4 w-4" />
          {{ starting ? 'Starting…' : 'Start attendance' }}
        </BaseButton>
        <p class="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Users class="h-3.5 w-3.5" />
          {{ schoolClass?.studentCount ?? 0 }} registered student{{
            (schoolClass?.studentCount ?? 0) === 1 ? '' : 's'
          }}
        </p>
      </div>

      <template v-else>
        <div class="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div class="space-y-4">
            <QrDisplay
              :value="attendanceUrl"
              title="Attendance QR"
              description="Students scan this code from /student/scan."
              :filename="`attendance-${classId}-${session.id}.png`"
              :countdown-label="countdownLabel"
              :show-regenerate="true"
              :regenerating="refreshing"
              @regenerate="refreshQr"
            />

            <div class="card p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="relative flex h-2.5 w-2.5">
                    <span
                      class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                    />
                    <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <p class="text-sm font-semibold text-slate-700">Live register</p>
                </div>
                <span class="flex items-center gap-1 text-xs text-slate-500">
                  <Clock class="h-3.5 w-3.5" />
                  Updates every 5s
                </span>
              </div>
              <BaseButton variant="secondary" size="sm" block class="mt-3" @click="refreshQr">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing }" />
                Refresh QR now
              </BaseButton>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="card p-4">
                <p class="text-sm font-medium text-slate-500">Present</p>
                <p class="mt-1 text-2xl font-bold text-emerald-600">{{ counts.present }}</p>
              </div>
              <div class="card p-4">
                <p class="text-sm font-medium text-slate-500">Late</p>
                <p class="mt-1 text-2xl font-bold text-amber-600">{{ counts.late }}</p>
              </div>
              <div class="card p-4">
                <p class="text-sm font-medium text-slate-500">Absent</p>
                <p class="mt-1 text-2xl font-bold text-rose-600">{{ counts.absent }}</p>
              </div>
            </div>

            <div
              v-if="attendanceStore.sessionError && participants.length > 0"
              class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
              <p>{{ attendanceStore.sessionError }}</p>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-slate-900">Students</h3>
                <p class="text-xs text-slate-500">
                  Change a status manually if a student checked in incorrectly.
                </p>
              </div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
                {{ participants.length }} enrolled
              </span>
            </div>

            <AttendanceTable
              :rows="participants"
              editable
              :loading="attendanceStore.sessionLoading && participants.length === 0"
              :error="participants.length === 0 ? attendanceStore.sessionError : ''"
              empty-message="Students will appear here once they register for the class."
              @update-status="updateStatus"
              @retry="retrySession"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
