<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Loader2, RefreshCw } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { createId } from '@/services/id'

const props = withDefaults(
  defineProps<{
    active?: boolean
    fps?: number
    qrbox?: number
  }>(),
  { active: true, fps: 10, qrbox: 240 },
)

const emit = defineEmits<{
  decoded: [text: string]
  error: [message: string]
}>()

const elementId = `qr-scanner-${createId('camera')}`
const scanner = ref<Html5Qrcode | null>(null)
const starting = ref(false)
const started = ref(false)
const cameraError = ref('')

let lastText = ''
let lastDecodedAt = 0

function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause)

  if (/permission|notallowed|denied/i.test(message)) {
    return 'Camera permission was denied. Allow camera access in your browser settings and try again.'
  }
  if (/notfound|no camera|devices/i.test(message)) {
    return 'No camera was found on this device. You can paste the QR link instead.'
  }
  if (/secure|https|not supported/i.test(message)) {
    return 'Camera scanning needs a secure connection (HTTPS or localhost). You can paste the QR link instead.'
  }

  return message || 'Unable to start the camera.'
}

function onDecoded(text: string): void {
  const now = Date.now()
  // html5-qrcode fires continuously while a code stays in frame.
  if (text === lastText && now - lastDecodedAt < 2500) return

  lastText = text
  lastDecodedAt = now
  emit('decoded', text)
}

async function start(): Promise<void> {
  if (started.value || starting.value) return

  starting.value = true
  cameraError.value = ''

  try {
    const instance = new Html5Qrcode(elementId, { verbose: false })
    scanner.value = instance
    await instance.start(
      { facingMode: 'environment' },
      {
        fps: props.fps,
        qrbox: { width: props.qrbox, height: props.qrbox },
        aspectRatio: 1,
      },
      onDecoded,
      () => {
        // Decode misses are expected while the camera searches for a code.
      },
    )
    started.value = true
  } catch (cause) {
    cameraError.value = friendlyError(cause)
    scanner.value = null
    emit('error', cameraError.value)
  } finally {
    starting.value = false
  }
}

async function stop(): Promise<void> {
  const instance = scanner.value
  scanner.value = null
  started.value = false

  if (!instance) return

  try {
    await instance.stop()
    instance.clear()
  } catch {
    // The scanner may already be stopped when the route changes.
  }
}

onMounted(() => {
  if (props.active) void start()
})

watch(
  () => props.active,
  (active) => {
    if (active) void start()
    else void stop()
  },
)

onBeforeUnmount(() => {
  void stop()
})

defineExpose({ start, stop })
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl bg-slate-900">
    <div
      :id="elementId"
      class="min-h-[300px] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
    />

    <div
      v-if="starting"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-300"
    >
      <Loader2 class="h-7 w-7 animate-spin text-indigo-400" />
      <p class="text-sm font-medium">Starting camera…</p>
      <p class="max-w-xs text-center text-xs text-slate-500">
        Allow camera access when your browser asks.
      </p>
    </div>

    <div
      v-if="cameraError"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-center"
    >
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-slate-300"
      >
        <Camera class="h-6 w-6" />
      </div>
      <p class="max-w-sm text-sm text-slate-300">{{ cameraError }}</p>
      <BaseButton variant="secondary" size="sm" @click="start">
        <RefreshCw class="h-4 w-4" />
        Retry camera
      </BaseButton>
    </div>

    <div
      v-if="started && !cameraError"
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div
        class="h-56 w-56 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
      />
      <p
        class="absolute bottom-4 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white"
      >
        Point the camera at the class QR
      </p>
    </div>
  </div>
</template>
