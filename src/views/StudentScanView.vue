<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Keyboard,
  Loader2,
  QrCode,
  ScanLine,
  ShieldCheck,
} from 'lucide-vue-next'

import QrScanner from '@/components/classes/QrScanner.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ApiError } from '@/services/api'
import { useAttendanceStore } from '@/stores/attendance'
import { useToastStore } from '@/stores/toast'
import type { AttendanceCheckInResult, AttendanceStatus } from '@/types'

type Mode = 'scan' | 'manual'

interface JoinPayload {
  type: 'join'
  classId: string
  token: string
}

interface AttendancePayload {
  type: 'attendance'
  sessionId: string
  token: string
}

type ParsedPayload = JoinPayload | AttendancePayload

const route = useRoute()
const router = useRouter()
const attendanceStore = useAttendanceStore()
const toast = useToastStore()

const mode = ref<Mode>('scan')
const manualValue = ref('')
const processing = ref(false)
const result = ref<AttendanceCheckInResult | null>(null)
const errorTitle = ref('')
const errorMessage = ref('')
const cameraError = ref('')

const scannerActive = computed(() => mode.value === 'scan' && !processing.value && !result.value)

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parsePayload(text: string): ParsedPayload | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed, window.location.origin)
    const token = url.searchParams.get('token') ?? ''
    const joinMatch = url.pathname.match(/^\/join\/([^/]+)\/?$/)

    if (joinMatch?.[1] && token) {
      return {
        type: 'join',
        classId: decodeURIComponent(joinMatch[1]),
        token,
      }
    }

    if (url.pathname === '/student/scan' || url.pathname === '/attendance/check-in') {
      if (token) {
        return {
          type: 'attendance',
          sessionId: url.searchParams.get('session') ?? url.searchParams.get('sessionId') ?? '',
          token,
        }
      }
    }
  } catch {
    // A raw code is handled as an attendance token below.
  }

  return { type: 'attendance', sessionId: '', token: trimmed }
}

function errorTitleFor(cause: ApiError): string {
  const code = (cause.code ?? '').toUpperCase()

  if (code.includes('EXPIRED') || cause.status === 410) return 'Attendance code expired'
  if (code.includes('ALREADY') || cause.status === 409) return 'Already checked in'
  if (code.includes('NOT_REGISTERED') || cause.status === 403)
    return 'Not registered for this class'
  if (code.includes('INVALID') || cause.status === 404) return 'Invalid QR code'
  if (code.includes('FULL')) return 'Class is full'

  return 'Check-in failed'
}

async function checkIn(sessionId: string, token: string): Promise<void> {
  if (processing.value) return

  processing.value = true
  errorTitle.value = ''
  errorMessage.value = ''
  cameraError.value = ''

  try {
    const response = await attendanceStore.checkIn(sessionId, token)
    result.value = response
    toast.success(response.message ?? 'Attendance recorded.')
  } catch (cause) {
    if (cause instanceof ApiError) {
      errorTitle.value = errorTitleFor(cause)
      errorMessage.value = cause.message
    } else {
      errorTitle.value = 'Check-in failed'
      errorMessage.value =
        cause instanceof Error ? cause.message : 'Unable to check in. Please try again.'
    }
  } finally {
    processing.value = false
  }
}

async function handleDecoded(text: string): Promise<void> {
  const payload = parsePayload(text)
  if (!payload) {
    errorTitle.value = 'Unrecognised QR code'
    errorMessage.value = 'This does not look like a class registration or attendance QR code.'
    return
  }

  if (payload.type === 'join') {
    await router.push({
      name: 'join-class',
      params: { classId: payload.classId },
      query: { token: payload.token },
    })
    return
  }

  await checkIn(payload.sessionId, payload.token)
}

function submitManual(): void {
  if (!manualValue.value.trim()) {
    errorTitle.value = 'Enter a code'
    errorMessage.value = 'Paste the QR link or the attendance code from your teacher.'
    return
  }

  void handleDecoded(manualValue.value)
}

function reset(): void {
  result.value = null
  errorTitle.value = ''
  errorMessage.value = ''
  cameraError.value = ''
  manualValue.value = ''
  mode.value = 'scan'
}

function switchMode(next: Mode): void {
  mode.value = next
  errorTitle.value = ''
  errorMessage.value = ''
}

function onCameraError(message: string): void {
  cameraError.value = message
}

function statusTone(status: AttendanceStatus): 'active' | 'warning' | 'danger' | 'info' {
  if (status === 'present') return 'active'
  if (status === 'late') return 'warning'
  if (status === 'absent') return 'danger'

  return 'info'
}

function formatTime(value?: string): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

onMounted(() => {
  const token = queryString(route.query.token)
  if (!token) return

  const sessionId = queryString(route.query.session) || queryString(route.query.sessionId)
  void checkIn(sessionId, token)
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">Scan to check in</h2>
      <p class="mt-1 text-sm text-slate-500">
        Scan your teacher's QR code, or open the registration link they shared.
      </p>
    </div>

    <div v-if="result" class="card overflow-hidden">
      <div class="flex flex-col items-center px-6 py-10 text-center">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <CheckCircle2 class="h-8 w-8" />
        </div>
        <h3 class="mt-4 text-lg font-semibold text-slate-900">You're checked in</h3>
        <p class="mt-1 text-sm text-slate-500">
          {{ result.className || 'Your attendance has been recorded.' }}
        </p>

        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <BaseBadge :tone="statusTone(result.status)">{{ result.status }}</BaseBadge>
          <span v-if="result.checkedInAt" class="text-xs text-slate-500">
            at {{ formatTime(result.checkedInAt) }}
          </span>
        </div>

        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <BaseButton variant="secondary" @click="reset">
            <ScanLine class="h-4 w-4" />
            Scan another
          </BaseButton>
          <RouterLink to="/student/classes">
            <BaseButton>
              My classes
              <ArrowRight class="h-4 w-4" />
            </BaseButton>
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-else-if="errorMessage" class="card overflow-hidden">
      <div class="flex flex-col items-center px-6 py-10 text-center">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600"
        >
          <AlertCircle class="h-8 w-8" />
        </div>
        <h3 class="mt-4 text-lg font-semibold text-slate-900">{{ errorTitle }}</h3>
        <p class="mt-1 max-w-md text-sm text-slate-500">{{ errorMessage }}</p>

        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <BaseButton variant="secondary" @click="reset">
            <ScanLine class="h-4 w-4" />
            Try again
          </BaseButton>
          <BaseButton variant="ghost" @click="switchMode('manual')">
            <Keyboard class="h-4 w-4" />
            Enter code instead
          </BaseButton>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="card p-2">
        <div class="grid grid-cols-2 gap-1">
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
              mode === 'scan' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50',
            ]"
            @click="switchMode('scan')"
          >
            <QrCode class="h-4 w-4" />
            Scan QR
          </button>
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
              mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50',
            ]"
            @click="switchMode('manual')"
          >
            <Keyboard class="h-4 w-4" />
            Enter link
          </button>
        </div>
      </div>

      <div
        v-if="processing"
        class="card flex flex-col items-center justify-center px-6 py-16 text-center"
      >
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
        <h3 class="mt-4 text-base font-semibold text-slate-900">Checking you in…</h3>
        <p class="mt-1 text-sm text-slate-500">Keep this page open for a moment.</p>
      </div>

      <template v-else-if="mode === 'scan'">
        <QrScanner :active="scannerActive" @decoded="handleDecoded" @error="onCameraError" />

        <p
          v-if="cameraError"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {{ cameraError }} Use the “Enter link” tab if the camera keeps failing.
        </p>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck class="h-4 w-4 text-indigo-500" />
            Camera scanning tips
          </p>
          <ul class="mt-2 space-y-1 text-xs text-slate-500">
            <li>Hold the phone steady and fill the square with the QR code.</li>
            <li>Camera access requires HTTPS or localhost.</li>
            <li>Registration QRs open the class summary; attendance QRs check you in instantly.</li>
          </ul>
        </div>
      </template>

      <div v-else class="card space-y-4 p-5">
        <div>
          <label for="manual-code" class="field-label">QR link or attendance code</label>
          <textarea
            id="manual-code"
            v-model="manualValue"
            rows="3"
            class="field-input resize-none"
            placeholder="https://…/join/class-id?token=… or paste the code"
          />
          <p class="mt-1 text-xs text-slate-500">
            Ask your teacher to share the link if your camera is unavailable.
          </p>
        </div>
        <BaseButton block @click="submitManual">
          <ArrowRight class="h-4 w-4" />
          Continue
        </BaseButton>
      </div>

      <RouterLink
        to="/student/classes"
        class="flex items-center justify-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        View my classes
        <ArrowRight class="h-4 w-4" />
      </RouterLink>
    </template>
  </div>
</template>
