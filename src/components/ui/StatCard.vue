<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    icon: Component
    tone?: 'indigo' | 'emerald' | 'amber' | 'sky'
  }>(),
  { hint: '', tone: 'indigo' },
)

const tones = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
}
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-slate-500">{{ label }}</p>
        <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{{ value }}</p>
        <p v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
      </div>
      <div :class="['rounded-xl p-3', tones[tone]]">
        <component :is="icon" class="h-6 w-6" />
      </div>
    </div>
  </div>
</template>
