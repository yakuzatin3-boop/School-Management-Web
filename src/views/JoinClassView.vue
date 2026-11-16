<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  QrCode,
  School,
  UserPlus,
} from 'lucide-vue-next'

import ClassCard from '@/components/classes/ClassCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ApiError } from '@/services/api'
import { useClassStore } from '@/stores/classes'
import { useToastStore } from '@/stores/toast'
import type { SchoolClass } from '@/types'

const route = useRoute()
const classStore = useClassStore()
const toast = useToastStore()

const classId = computed(() => String(route.params.classId))
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const schoolClass = ref<SchoolClass | null>(null)
const loading = ref(true)
const registering = ref(false)
const registered = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')

const isFull = computed(() => {
  if (!schoolClass.value?.maxStudents) return false

  const studentCount =
    schoolClass.value.studentCount ??
    schoolClass.value.enrollments?.filter((enrollment) => enrollment.status === 'active').length ??
    0

  return studentCount >= schoolClass.value.maxStudents
})

function errorTitleFor(cause: ApiError): string {
  const code = (cause.code ?? '').toUpperCase()

  if (code.includes('EXPIRED') || cause.status === 410) return 'Registration link expired'
  if (code.includes('ALREADY') || cause.status === 409) return 'Already registered'
  if (code.includes('FULL')) return 'Class is full'
  if (code.includes('INVALID') || cause.status === 404) return 'Invalid registration link'

  return 'Unable to join this class'
}

function setError(cause: unknown, fallbackTitle: string): void {
  if (cause instanceof ApiError) {
    errorTitle.value = errorTitleFor(cause)
    errorMessage.value = cause.message
    return
  }

  errorTitle.value = fallbackTitle
  errorMessage.value =
    cause instanceof Error ? cause.message : 'Check your connection and try again.'
}

async function loadClass(): Promise<void> {
  loading.value = true
  errorTitle.value = ''
  errorMessage.value = ''

  if (!token.value) {
    loading.value = false
    errorTitle.value = 'Missing registration token'
    errorMessage.value =
      'This link is incomplete. Ask your teacher to share the registration QR again.'
    return
  }

  try {
    schoolClass.value = await classStore.previewJoin(classId.value, token.value)
  } catch (cause) {
    setError(cause, 'Unable to load this class')
  } finally {
    loading.value = false
  }
}

async function register(): Promise<void> {
  if (!schoolClass.value || registering.value || isFull.value) return

  registering.value = true
  errorTitle.value = ''
  errorMessage.value = ''

  try {
    await classStore.register(classId.value, token.value)
    registered.value = true
    toast.success(`You joined ${schoolClass.value.name}.`)
  } catch (cause) {
    setError(cause, 'Unable to register')
  } finally {
    registering.value = false
  }
}

onMounted(loadClass)
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-xl items-center gap-3 px-4 py-4 sm:px-6">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <School class="h-5 w-5" />
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-900">Class registration</p>
          <p class="text-xs text-slate-500">Scan. Review. Join.</p>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-8">
      <div v-if="loading" class="space-y-4">
        <div class="card h-64 animate-pulse" />
        <div class="card h-14 animate-pulse" />
      </div>

      <div v-else-if="registered && schoolClass" class="card overflow-hidden">
        <div class="flex flex-col items-center px-6 py-10 text-center">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
          >
            <CheckCircle2 class="h-8 w-8" />
          </div>
          <h1 class="mt-4 text-xl font-bold text-slate-900">You're registered</h1>
          <p class="mt-1 text-sm text-slate-500">
            You joined <span class="font-semibold text-slate-700">{{ schoolClass.name }}</span
            >. Your teacher can now see you on the class roster.
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <RouterLink to="/student/classes">
              <BaseButton>
                My classes
                <ArrowRight class="h-4 w-4" />
              </BaseButton>
            </RouterLink>
            <RouterLink to="/student/scan">
              <BaseButton variant="secondary">
                <QrCode class="h-4 w-4" />
                Scan attendance
              </BaseButton>
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-else-if="errorTitle" class="card overflow-hidden">
        <div class="flex flex-col items-center px-6 py-10 text-center">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600"
          >
            <AlertCircle class="h-8 w-8" />
          </div>
          <h1 class="mt-4 text-xl font-bold text-slate-900">{{ errorTitle }}</h1>
          <p class="mt-1 max-w-sm text-sm text-slate-500">{{ errorMessage }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <BaseButton variant="secondary" @click="loadClass">Try again</BaseButton>
            <RouterLink to="/student/classes">
              <BaseButton variant="ghost">My classes</BaseButton>
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-else-if="schoolClass" class="space-y-4">
        <ClassCard :school-class="schoolClass" />

        <div class="card p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-lg font-semibold text-slate-900">Join {{ schoolClass.name }}</h1>
              <p class="mt-1 text-sm text-slate-500">
                Registering adds you to the roster so you can check in to attendance sessions.
              </p>
            </div>
            <BaseBadge :tone="isFull ? 'danger' : 'active'">
              {{ isFull ? 'Class full' : 'Open' }}
            </BaseBadge>
          </div>

          <div
            v-if="isFull"
            class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            This class has reached its maximum number of students. Ask your teacher for help.
          </div>

          <BaseButton block class="mt-5" :disabled="registering || isFull" @click="register">
            <Loader2 v-if="registering" class="h-4 w-4 animate-spin" />
            <UserPlus v-else class="h-4 w-4" />
            {{ registering ? 'Registering…' : isFull ? 'Class is full' : 'Register' }}
          </BaseButton>

          <p class="mt-3 text-center text-xs text-slate-400">
            Already registered? You will see this class under “My classes”.
          </p>
        </div>

        <RouterLink
          to="/student/classes"
          class="flex items-center justify-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Go to my classes
          <ArrowRight class="h-4 w-4" />
        </RouterLink>
      </div>
    </main>
  </div>
</template>
