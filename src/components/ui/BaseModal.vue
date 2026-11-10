<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    wide?: boolean
  }>(),
  { description: '', wide: false },
)

const emit = defineEmits<{ close: [] }>()

const panelWidth = computed(() => (props.wide ? 'max-w-3xl' : 'max-w-lg'))

function close(): void {
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) close()
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => document.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <button
            type="button"
            class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-label="Close dialog"
            @click="close"
          />

          <div
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            :class="[
              'relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5',
              panelWidth,
            ]"
          >
            <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
                <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
                @click="close"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
              <slot />
            </div>

            <div v-if="$slots.footer" class="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
