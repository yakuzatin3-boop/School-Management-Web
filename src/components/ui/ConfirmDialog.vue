<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
  }>(),
  { confirmLabel: 'Delete' },
)

const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <BaseModal :open="open" :title="title" @close="emit('close')">
    <p class="text-sm text-slate-600">{{ message }}</p>

    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="danger" @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
