<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { Download, Loader2, Maximize2, Printer, QrCode, RefreshCw, X } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'

const props = withDefaults(
  defineProps<{
    value: string
    title?: string
    description?: string
    filename?: string
    size?: number
    showRegenerate?: boolean
    regenerating?: boolean
    countdownLabel?: string
  }>(),
  {
    title: 'QR code',
    description: '',
    filename: 'class-qr.png',
    size: 240,
    showRegenerate: false,
    regenerating: false,
    countdownLabel: '',
  },
)

const emit = defineEmits<{ regenerate: [] }>()

const inlineRef = ref<HTMLElement | null>(null)
const fullscreenRef = ref<HTMLElement | null>(null)
const fullscreen = ref(false)

const hasValue = computed(() => props.value.trim().length > 0)

function canvasFrom(element: HTMLElement | null): HTMLCanvasElement | null {
  return element?.querySelector('canvas') ?? null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function downloadImage(): void {
  const canvas = canvasFrom(fullscreen.value ? fullscreenRef.value : inlineRef.value)
  if (!canvas) return

  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = props.filename
  link.click()
}

function printImage(): void {
  const canvas = canvasFrom(fullscreen.value ? fullscreenRef.value : inlineRef.value)
  if (!canvas) return

  const printWindow = window.open('', '_blank', 'width=760,height=860')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(props.title)}</title>
        <style>
          body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 32px; text-align: center; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          p { color: #64748b; font-size: 13px; margin: 0 0 24px; }
          img { width: 360px; height: 360px; }
          small { display: block; margin-top: 20px; color: #94a3b8; font-size: 11px; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(props.title)}</h1>
        <p>${escapeHtml(props.description)}</p>
        <img src="${canvas.toDataURL('image/png')}" alt="QR code" />
        <small>${escapeHtml(props.value)}</small>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

watch(fullscreen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="card overflow-hidden">
    <div
      class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"
    >
      <div>
        <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
        <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
      </div>
      <span
        v-if="countdownLabel"
        class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20"
      >
        {{ countdownLabel }}
      </span>
    </div>

    <div class="flex flex-col items-center px-5 py-6">
      <div
        v-if="hasValue"
        ref="inlineRef"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <QrcodeVue
          :value="value"
          :size="size"
          level="M"
          render-as="canvas"
          background="#ffffff"
          foreground="#0f172a"
          :margin="2"
        />
      </div>

      <div
        v-else
        class="flex h-48 w-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center"
      >
        <QrCode class="h-10 w-10 text-slate-300" />
        <p class="mt-2 px-4 text-xs text-slate-400">No QR code available yet.</p>
      </div>

      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <BaseButton v-if="hasValue" variant="secondary" size="sm" @click="fullscreen = true">
          <Maximize2 class="h-4 w-4" />
          Full screen
        </BaseButton>
        <BaseButton v-if="hasValue" variant="secondary" size="sm" @click="downloadImage">
          <Download class="h-4 w-4" />
          Download
        </BaseButton>
        <BaseButton v-if="hasValue" variant="secondary" size="sm" @click="printImage">
          <Printer class="h-4 w-4" />
          Print
        </BaseButton>
        <BaseButton
          v-if="showRegenerate"
          variant="ghost"
          size="sm"
          :disabled="regenerating"
          @click="emit('regenerate')"
        >
          <Loader2 v-if="regenerating" class="h-4 w-4 animate-spin" />
          <RefreshCw v-else class="h-4 w-4" />
          Regenerate
        </BaseButton>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="fullscreen"
        class="fixed inset-0 z-[90] flex flex-col bg-white"
        role="dialog"
        aria-modal="true"
        :aria-label="`${title} full screen`"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
            <p v-if="description" class="text-sm text-slate-500">{{ description }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close full screen QR"
            @click="fullscreen = false"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <div class="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6">
          <div
            ref="fullscreenRef"
            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <QrcodeVue
              :value="value"
              :size="360"
              level="M"
              render-as="canvas"
              background="#ffffff"
              foreground="#0f172a"
              :margin="2"
            />
          </div>
          <p v-if="countdownLabel" class="text-sm font-semibold text-amber-700">
            {{ countdownLabel }}
          </p>
          <p class="max-w-md break-all text-center text-xs text-slate-400">{{ value }}</p>

          <div class="flex flex-wrap justify-center gap-2">
            <BaseButton variant="secondary" @click="downloadImage">
              <Download class="h-4 w-4" />
              Download PNG
            </BaseButton>
            <BaseButton variant="secondary" @click="printImage">
              <Printer class="h-4 w-4" />
              Print
            </BaseButton>
            <BaseButton variant="ghost" @click="fullscreen = false">Close</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
:deep(canvas) {
  max-width: 100%;
  height: auto;
}
</style>
