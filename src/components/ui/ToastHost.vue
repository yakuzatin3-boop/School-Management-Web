<script setup lang="ts">
import { CheckCircle2, Info, XCircle } from 'lucide-vue-next'

import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const tones = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
}

const iconTones = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-sky-500',
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition ease-out duration-200"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
          tones[toast.tone],
        ]"
      >
        <component
          :is="icons[toast.tone]"
          :class="['mt-0.5 h-5 w-5 shrink-0', iconTones[toast.tone]]"
        />
        <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
        <button
          type="button"
          class="text-current/60 transition hover:text-current"
          aria-label="Dismiss notification"
          @click="toastStore.dismiss(toast.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
