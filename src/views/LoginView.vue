<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Mail,
  School,
  Users,
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const form = reactive({
  email: '',
  password: '',
})

const showPassword = ref(false)
const error = ref('')
const isSubmitting = ref(false)

const features = [
  { icon: GraduationCap, text: 'Student records and enrollment in one place' },
  { icon: Users, text: 'Teacher profiles, subjects, and assignments' },
  { icon: BookOpen, text: 'Class schedules, rooms, and capacity tracking' },
  { icon: LayoutDashboard, text: 'Live dashboard with the numbers that matter' },
]

async function submit(): Promise<void> {
  error.value = ''

  if (!form.email.trim() || !form.password) {
    error.value = 'Enter your email and password to continue.'
    return
  }

  isSubmitting.value = true
  try {
    await auth.login({ email: form.email, password: form.password })
    toast.success(`Welcome back, ${auth.user?.name ?? 'there'}!`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (cause) {
    error.value =
      cause instanceof ApiError
        ? cause.message
        : 'Unable to reach the school server. Check your connection and try again.'
  } finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <div
      class="relative hidden overflow-hidden bg-slate-900 px-12 py-14 text-white lg:flex lg:flex-col"
    >
      <div
        class="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl"
      />

      <div class="relative flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500">
          <School class="h-6 w-6" />
        </div>
        <div>
          <p class="text-sm font-semibold">Northwood Academy</p>
          <p class="text-xs text-slate-400">School Management System</p>
        </div>
      </div>

      <div class="relative my-auto max-w-lg">
        <p class="text-sm font-semibold uppercase tracking-wider text-indigo-400">
          Run your school with confidence
        </p>
        <h1 class="mt-4 text-4xl font-bold leading-tight tracking-tight">
          Everything your school needs, in one place.
        </h1>
        <p class="mt-4 text-base leading-relaxed text-slate-400">
          Manage students, teachers, and classes from a single, fast workspace — built for busy
          school teams.
        </p>

        <ul class="mt-10 space-y-4">
          <li v-for="feature in features" :key="feature.text" class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <component :is="feature.icon" class="h-4 w-4 text-indigo-300" />
            </span>
            <span class="text-sm text-slate-300">{{ feature.text }}</span>
          </li>
        </ul>
      </div>

      <p class="relative text-xs text-slate-500">
        © {{ new Date().getFullYear() }} Northwood Academy. All rights reserved.
      </p>
    </div>

    <div class="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
      <div class="w-full max-w-md">
        <div class="mb-8 flex items-center gap-3 lg:hidden">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"
          >
            <School class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-900">Northwood Academy</p>
            <p class="text-xs text-slate-500">School Management System</p>
          </div>
        </div>

        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
        <p class="mt-1 text-sm text-slate-500">Sign in to continue to your dashboard.</p>

        <form class="mt-8 space-y-5" novalidate @submit.prevent="submit">
          <div>
            <label for="email" class="field-label">Email address</label>
            <div class="relative">
              <Mail
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="you@school.edu"
                class="field-input pl-10"
              />
            </div>
          </div>

          <div>
            <label for="password" class="field-label">Password</label>
            <div class="relative">
              <Lock
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                class="field-input pl-10 pr-10"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <p
            v-if="error"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
          >
            {{ error }}
          </p>

          <BaseButton type="submit" block :disabled="isSubmitting">
            {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
            <ArrowRight v-if="!isSubmitting" class="h-4 w-4" />
          </BaseButton>
        </form>
      </div>
    </div>
  </div>
</template>
