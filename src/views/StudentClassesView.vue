<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertCircle, BookOpen, QrCode, ScanLine } from 'lucide-vue-next'

import ClassCard from '@/components/classes/ClassCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useClassStore } from '@/stores/classes'

const classStore = useClassStore()
const error = ref('')

const myClasses = computed(() => classStore.classes)

async function loadClasses(): Promise<void> {
  error.value = ''

  try {
    await classStore.loadMine()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to load your classes.'
  }
}

onMounted(loadClasses)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">My classes</h2>
        <p class="mt-1 text-sm text-slate-500">
          Classes you joined by QR. Scan an attendance code when your teacher starts a session.
        </p>
      </div>
      <RouterLink to="/student/scan">
        <BaseButton>
          <QrCode class="h-4 w-4" />
          Scan QR
        </BaseButton>
      </RouterLink>
    </div>

    <div v-if="classStore.myClassesLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="index in 4" :key="index" class="card space-y-4 p-5">
        <div class="flex items-center gap-3">
          <div class="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div class="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div class="space-y-2">
          <div class="h-3 w-40 animate-pulse rounded bg-slate-100" />
          <div class="h-3 w-36 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>

    <div
      v-else-if="error"
      class="card flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertCircle class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">Unable to load your classes</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ error }}</p>
      <BaseButton variant="secondary" class="mt-5" @click="loadClasses">Try again</BaseButton>
    </div>

    <div v-else-if="myClasses.length > 0" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="schoolClass in myClasses" :key="schoolClass.id" class="flex flex-col gap-2">
        <ClassCard :school-class="schoolClass" class="flex-1" />
        <RouterLink :to="`/student/scan`" class="block">
          <BaseButton variant="secondary" size="sm" block>
            <ScanLine class="h-4 w-4" />
            Scan attendance QR
          </BaseButton>
        </RouterLink>
      </div>
    </div>

    <div v-else class="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <BookOpen class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">No classes yet</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">
        Scan your teacher's registration QR to join a class. It will appear here afterwards.
      </p>
      <RouterLink to="/student/scan" class="mt-5">
        <BaseButton>
          <QrCode class="h-4 w-4" />
          Scan a class QR
        </BaseButton>
      </RouterLink>
    </div>
  </div>
</template>
