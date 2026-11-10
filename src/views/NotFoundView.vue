<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, School } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const home = computed(() => (auth.isAuthenticated ? '/' : '/login'))
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md text-center">
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white"
      >
        <School class="h-7 w-7" />
      </div>
      <p class="mt-6 text-sm font-semibold uppercase tracking-wider text-indigo-600">404</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p class="mt-3 text-sm text-slate-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <RouterLink
        :to="home"
        class="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to {{ auth.isAuthenticated ? 'dashboard' : 'sign in' }}
      </RouterLink>
    </div>
  </div>
</template>
