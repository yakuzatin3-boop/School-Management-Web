import { ref } from 'vue'
import { defineStore } from 'pinia'

import { createId } from '@/services/id'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function dismiss(id: string): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(message: string, tone: ToastTone = 'success'): void {
    const id = createId('toast')
    toasts.value = [...toasts.value, { id, message, tone }]
    window.setTimeout(() => dismiss(id), 3200)
  }

  function success(message: string): void {
    push(message, 'success')
  }

  function error(message: string): void {
    push(message, 'error')
  }

  return { toasts, push, dismiss, success, error }
})
