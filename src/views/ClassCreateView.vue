<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, QrCode } from 'lucide-vue-next'

import ClassForm from '@/components/classes/ClassForm.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useClassStore } from '@/stores/classes'
import { useToastStore } from '@/stores/toast'
import type { ManagedClassDraft } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const classStore = useClassStore()
const toast = useToastStore()

const submitting = ref(false)
const formError = ref('')

async function createClass(draft: ManagedClassDraft): Promise<void> {
  submitting.value = true
  formError.value = ''

  try {
    const created = await classStore.createManaged({
      ...draft,
      teacherId: auth.user?.id,
    })
    toast.success('Class created. Share the registration QR with your students.')
    await router.push(`/teacher/classes/${created.id}`)
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'Unable to create the class.'
  } finally {
    submitting.value = false
  }
}

function cancel(): void {
  void router.push('/teacher/classes')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <RouterLink to="/teacher/classes">
          <BaseButton variant="ghost" size="sm" aria-label="Back to classes">
            <ArrowLeft class="h-4 w-4" />
          </BaseButton>
        </RouterLink>
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Create a class</h2>
          <p class="mt-1 text-sm text-slate-500">
            Set the course, location, and schedule. A registration QR is generated automatically.
          </p>
        </div>
      </div>
      <div
        class="hidden items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 sm:flex"
      >
        <QrCode class="h-4 w-4" />
        QR registration included
      </div>
    </div>

    <ClassForm :submitting="submitting" :error="formError" @submit="createClass" @cancel="cancel" />
  </div>
</template>
