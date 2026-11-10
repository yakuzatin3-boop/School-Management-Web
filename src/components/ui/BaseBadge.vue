<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'active' | 'inactive' | 'info' | 'warning' | 'danger' | 'neutral'

const props = withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' })

const tones: Record<Tone, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  info: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
}

const classes = computed(() => [
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize',
  tones[props.tone],
])
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
