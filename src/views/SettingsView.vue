<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import {
  CalendarDays,
  CheckCircle2,
  Database,
  Mail,
  MapPin,
  Phone,
  Save,
  School,
  ShieldCheck,
  UserRound,
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import type { SchoolSettings } from '@/types'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToastStore()

const canEditSchool = computed(() => auth.isAdmin)
const schoolForm = reactive<SchoolSettings>({ ...settingsStore.settings })
const profileForm = reactive({ name: auth.user?.name ?? '' })

function saveSchool(): void {
  if (!canEditSchool.value) return

  settingsStore
    .update({ ...schoolForm })
    .then(() => {
      toast.success('School details saved.')
    })
    .catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save school details.')
    })
}

function saveProfile(): void {
  if (!profileForm.name.trim()) {
    toast.error('Your name cannot be empty.')
    return
  }

  auth.updateProfile(profileForm.name)
  toast.success('Profile updated.')
}

onMounted(async () => {
  await settingsStore.load()
  Object.assign(schoolForm, settingsStore.settings)
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
      <p class="mt-1 text-sm text-slate-500">
        Manage school details, academic periods, and your account.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <section class="card p-5">
          <div class="flex items-center gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
            >
              <School class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-semibold text-slate-900">School information</h3>
              <p class="text-xs text-slate-500">
                {{ canEditSchool ? 'Shown across the dashboard and reports.' : 'Read-only — administrators manage these details.' }}
              </p>
            </div>
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="saveSchool">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="school-name" class="field-label">School name</label>
                <input
                  id="school-name"
                  v-model="schoolForm.name"
                  type="text"
                  class="field-input"
                  :disabled="!canEditSchool"
                />
              </div>
              <div>
                <label for="school-principal" class="field-label">Principal</label>
                <input
                  id="school-principal"
                  v-model="schoolForm.principal"
                  type="text"
                  class="field-input"
                  :disabled="!canEditSchool"
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="school-email" class="field-label">Email</label>
                <div class="relative">
                  <Mail
                    class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="school-email"
                    v-model="schoolForm.email"
                    type="email"
                    class="field-input pl-10"
                    :disabled="!canEditSchool"
                  />
                </div>
              </div>
              <div>
                <label for="school-phone" class="field-label">Phone</label>
                <div class="relative">
                  <Phone
                    class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="school-phone"
                    v-model="schoolForm.phone"
                    type="tel"
                    class="field-input pl-10"
                    :disabled="!canEditSchool"
                  />
                </div>
              </div>
            </div>

            <div>
              <label for="school-address" class="field-label">Address</label>
              <div class="relative">
                <MapPin class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="school-address"
                  v-model="schoolForm.address"
                  type="text"
                  class="field-input pl-10"
                  :disabled="!canEditSchool"
                />
              </div>
            </div>

            <div v-if="canEditSchool" class="flex justify-end">
              <BaseButton type="submit">
                <Save class="h-4 w-4" />
                Save school details
              </BaseButton>
            </div>
          </form>
        </section>

        <section class="card p-5">
          <div class="flex items-center gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
            >
              <CalendarDays class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-semibold text-slate-900">Academic period</h3>
              <p class="text-xs text-slate-500">Used for attendance, grades, and fee labels.</p>
            </div>
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="saveSchool">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="school-year" class="field-label">Academic year</label>
                <input
                  id="school-year"
                  v-model="schoolForm.academicYear"
                  type="text"
                  class="field-input"
                  :disabled="!canEditSchool"
                />
              </div>
              <div>
                <label for="school-term" class="field-label">Current term</label>
                <select
                  id="school-term"
                  v-model="schoolForm.term"
                  class="field-input"
                  :disabled="!canEditSchool"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
            </div>

            <div v-if="canEditSchool" class="flex justify-end">
              <BaseButton type="submit">
                <Save class="h-4 w-4" />
                Save academic period
              </BaseButton>
            </div>
          </form>
        </section>
      </div>

      <div class="space-y-6">
        <section class="card p-5">
          <div class="flex items-center gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600"
            >
              <UserRound class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-semibold text-slate-900">Your profile</h3>
              <p class="text-xs text-slate-500">Signed-in account details.</p>
            </div>
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="saveProfile">
            <div>
              <label for="profile-name" class="field-label">Full name</label>
              <input id="profile-name" v-model="profileForm.name" type="text" class="field-input" />
            </div>
            <div>
              <p class="field-label">Email</p>
              <p
                class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              >
                {{ auth.user?.email }}
              </p>
            </div>
            <div>
              <p class="field-label">Role</p>
              <p
                class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                <ShieldCheck class="h-3.5 w-3.5" />
                {{ auth.user?.role }}
              </p>
            </div>

            <BaseButton type="submit" block>
              <Save class="h-4 w-4" />
              Save profile
            </BaseButton>
          </form>
        </section>

        <section class="card p-5">
          <div class="flex items-center gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
            >
              <Database class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-semibold text-slate-900">System status</h3>
              <p class="text-xs text-slate-500">Data is stored securely on the school server.</p>
            </div>
          </div>

          <ul class="mt-4 space-y-2.5 text-sm">
            <li class="flex items-center justify-between gap-3">
              <span class="text-slate-600">School API</span>
              <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 class="h-3.5 w-3.5" />
                Connected
              </span>
            </li>
            <li class="flex items-center justify-between gap-3">
              <span class="text-slate-600">Role</span>
              <span class="text-xs font-medium text-slate-800">{{ auth.user?.role }}</span>
            </li>
            <li class="flex items-center justify-between gap-3">
              <span class="text-slate-600">Academic year</span>
              <span class="text-xs font-medium text-slate-800">
                {{ settingsStore.settings.academicYear }}
              </span>
            </li>
          </ul>

          <p class="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {{
              canEditSchool
                ? 'You have administrator access. Changes save directly to the server.'
                : 'Contact an administrator to update school-wide settings.'
            }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
