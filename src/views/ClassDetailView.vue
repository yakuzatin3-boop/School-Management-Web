<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Copy,
  Link2,
  Users,
} from 'lucide-vue-next'

import ClassCard from '@/components/classes/ClassCard.vue'
import QrDisplay from '@/components/classes/QrDisplay.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { fullName, initials } from '@/services/format'
import { useClassStore } from '@/stores/classes'
import { useToastStore } from '@/stores/toast'
import type { ClassEnrollment } from '@/types'

const route = useRoute()
const classStore = useClassStore()
const toast = useToastStore()

const classId = computed(() => String(route.params.id))
const schoolClass = computed(() => classStore.find(classId.value))
const loading = ref(true)
const error = ref('')
const tokenLoading = ref(false)
const tokenError = ref('')
const regenerating = ref(false)
const confirmRegenerate = ref(false)

const activeEnrollments = computed<ClassEnrollment[]>(
  () =>
    schoolClass.value?.enrollments?.filter((enrollment) => enrollment.status === 'active') ?? [],
)

const registrationUrl = computed(() => {
  const token = schoolClass.value?.registrationToken
  if (!token) return ''

  const url = new URL(`/join/${classId.value}`, window.location.origin)
  url.searchParams.set('token', token)

  return url.toString()
})

async function generateToken(silent = false): Promise<void> {
  tokenLoading.value = true
  tokenError.value = ''

  try {
    await classStore.ensureToken(classId.value)
  } catch (cause) {
    tokenError.value =
      cause instanceof Error ? cause.message : 'Unable to generate a registration QR code.'
    if (!silent) toast.error(tokenError.value)
  } finally {
    tokenLoading.value = false
  }
}

async function loadClass(): Promise<void> {
  loading.value = true
  error.value = ''
  tokenError.value = ''

  try {
    const loaded = await classStore.loadOne(classId.value)
    if (!loaded.registrationToken) await generateToken(true)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to load this class.'
  } finally {
    loading.value = false
  }
}

async function regenerate(): Promise<void> {
  regenerating.value = true
  tokenError.value = ''

  try {
    await classStore.regenerateToken(classId.value)
    confirmRegenerate.value = false
    toast.success('Registration QR regenerated. The previous code no longer works.')
  } catch (cause) {
    tokenError.value =
      cause instanceof Error ? cause.message : 'Unable to regenerate the registration QR.'
    toast.error(tokenError.value)
  } finally {
    regenerating.value = false
  }
}

async function copyLink(): Promise<void> {
  if (!registrationUrl.value) return

  try {
    await navigator.clipboard.writeText(registrationUrl.value)
    toast.success('Registration link copied to clipboard.')
  } catch {
    toast.error('Unable to copy the link. Select and copy it manually.')
  }
}

watch(classId, loadClass)
onMounted(loadClass)
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
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">
            {{ schoolClass?.name ?? 'Class details' }}
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Share the registration QR, then run a live attendance session.
          </p>
        </div>
      </div>

      <div v-if="schoolClass" class="flex flex-wrap gap-2">
        <RouterLink :to="`/teacher/classes/${classId}/attendance`">
          <BaseButton>
            <CalendarCheck class="h-4 w-4" />
            Start attendance
          </BaseButton>
        </RouterLink>
        <RouterLink :to="`/teacher/classes/${classId}/report`">
          <BaseButton variant="secondary">
            <BarChart3 class="h-4 w-4" />
            Report
          </BaseButton>
        </RouterLink>
      </div>
    </div>

    <div v-if="loading" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div class="space-y-4">
        <div class="card h-64 animate-pulse" />
        <div class="card h-48 animate-pulse" />
      </div>
      <div class="card h-96 animate-pulse" />
    </div>

    <div
      v-else-if="error"
      class="card flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertCircle class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">Class not available</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ error }}</p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" @click="loadClass">Try again</BaseButton>
        <RouterLink to="/teacher/classes">
          <BaseButton>Back to classes</BaseButton>
        </RouterLink>
      </div>
    </div>

    <div v-else-if="schoolClass" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div class="space-y-6">
        <ClassCard :school-class="schoolClass" :show-teacher="false" />

        <div class="card p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-slate-900">Registered students</h3>
              <p class="text-xs text-slate-500">
                {{ activeEnrollments.length }} active student{{
                  activeEnrollments.length === 1 ? '' : 's'
                }}
              </p>
            </div>
            <BaseBadge tone="info">
              <Users class="mr-1 h-3 w-3" />
              {{ activeEnrollments.length }}
              <template v-if="schoolClass.maxStudents"> / {{ schoolClass.maxStudents }}</template>
            </BaseBadge>
          </div>

          <ul v-if="activeEnrollments.length > 0" class="mt-4 divide-y divide-slate-100">
            <li
              v-for="enrollment in activeEnrollments.slice(0, 8)"
              :key="enrollment.id"
              class="flex items-center gap-3 py-3"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
              >
                {{ initials(enrollment.student.firstName, enrollment.student.lastName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-800">
                  {{ fullName(enrollment.student.firstName, enrollment.student.lastName) }}
                </p>
                <p class="truncate text-xs text-slate-500">{{ enrollment.student.email }}</p>
              </div>
              <BaseBadge tone="active">registered</BaseBadge>
            </li>
          </ul>

          <div v-else class="flex flex-col items-center justify-center py-10 text-center">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"
            >
              <Users class="h-5 w-5" />
            </div>
            <p class="mt-3 text-sm font-semibold text-slate-900">No registrations yet</p>
            <p class="mt-1 max-w-xs text-sm text-slate-500">
              Students who scan the registration QR will appear here.
            </p>
          </div>

          <p
            v-if="activeEnrollments.length > 8"
            class="mt-2 text-center text-xs font-medium text-slate-500"
          >
            Showing 8 of {{ activeEnrollments.length }} students. Open the report for the full list.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <QrDisplay
          :value="registrationUrl"
          title="Registration QR"
          description="Students scan this to join the class."
          :filename="`class-${schoolClass.name}-registration.png`"
          :show-regenerate="true"
          :regenerating="regenerating || tokenLoading"
          @regenerate="confirmRegenerate = true"
        />

        <div v-if="tokenError" class="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p class="text-sm font-medium text-rose-800">Registration QR unavailable</p>
          <p class="mt-1 text-xs text-rose-700">{{ tokenError }}</p>
          <BaseButton variant="secondary" size="sm" class="mt-3" @click="generateToken(false)">
            Try again
          </BaseButton>
        </div>

        <div v-if="registrationUrl" class="card p-4">
          <p class="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Link2 class="h-3.5 w-3.5" />
            Registration link
          </p>
          <p class="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {{ registrationUrl }}
          </p>
          <BaseButton variant="secondary" size="sm" block class="mt-3" @click="copyLink">
            <Copy class="h-4 w-4" />
            Copy link
          </BaseButton>
          <p class="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 class="h-3 w-3" />
            Regenerating invalidates the previous QR and link.
          </p>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmRegenerate"
      title="Regenerate registration QR?"
      message="The current QR code and link will stop working immediately. Students who already registered keep their enrollment."
      confirm-label="Regenerate QR"
      @close="confirmRegenerate = false"
      @confirm="regenerate"
    />
  </div>
</template>
