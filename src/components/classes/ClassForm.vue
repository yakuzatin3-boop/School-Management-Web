<script setup lang="ts">
import { reactive, watch } from 'vue'
import { BookOpen, CalendarDays, Clock, Loader2, MapPin, Save, Users } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import {
  BUILDING_NAMES,
  COURSE_NAMES,
  WEEKDAY_NAMES,
  type CourseName,
  type ManagedClassDraft,
  type WeekdayName,
} from '@/types'

interface FormState {
  name: string
  course: CourseName
  building: string
  customBuilding: string
  floor: string
  roomNumber: string
  days: WeekdayName[]
  startTime: string
  endTime: string
  startDate: string
  endDate: string
  maxStudents: string
}

const props = withDefaults(
  defineProps<{
    initial?: Partial<ManagedClassDraft>
    submitting?: boolean
    error?: string
  }>(),
  { submitting: false, error: '' },
)

const emit = defineEmits<{
  submit: [draft: ManagedClassDraft]
  cancel: []
}>()

function isoDate(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)

  return date.toISOString().slice(0, 10)
}

function stateFrom(initial?: Partial<ManagedClassDraft>): FormState {
  const building = initial?.building ?? BUILDING_NAMES[0]
  const isKnownBuilding = BUILDING_NAMES.includes(building as (typeof BUILDING_NAMES)[number])

  return {
    name: initial?.name ?? '',
    course: initial?.course ?? COURSE_NAMES[0],
    building: isKnownBuilding ? building : 'Other',
    customBuilding: isKnownBuilding ? '' : building,
    floor: initial?.floor ?? '1',
    roomNumber: initial?.roomNumber ?? '',
    days: initial?.scheduleDays ? [...initial.scheduleDays] : ['Monday', 'Wednesday'],
    startTime: initial?.startTime ?? '09:00',
    endTime: initial?.endTime ?? '10:30',
    startDate: initial?.startDate ?? isoDate(),
    endDate: initial?.endDate ?? isoDate(90),
    maxStudents: initial?.maxStudents ? String(initial.maxStudents) : '',
  }
}

const form = reactive<FormState>(stateFrom(props.initial))
const errors = reactive<Record<string, string>>({})

watch(
  () => props.initial,
  (value) => Object.assign(form, stateFrom(value)),
  { deep: true },
)

function clearErrors(): void {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function validate(): boolean {
  clearErrors()

  if (!form.name.trim()) errors.name = 'Class name is required.'
  if (!form.course) errors.course = 'Choose a course.'

  const building = form.building === 'Other' ? form.customBuilding.trim() : form.building
  if (!building) errors.building = 'Building is required.'

  const floor = Number(form.floor)
  if (!form.floor.trim() || !Number.isInteger(floor) || floor < 1 || floor > 100) {
    errors.floor = 'Enter a floor between 1 and 100.'
  }

  if (form.days.length === 0) errors.days = 'Choose at least one day of the week.'
  if (!form.startTime || !form.endTime) {
    errors.time = 'Start and end time are required.'
  } else if (form.endTime <= form.startTime) {
    errors.time = 'End time must be after start time.'
  }

  if (!form.startDate || !form.endDate) {
    errors.dates = 'Start and end dates are required.'
  } else if (form.endDate < form.startDate) {
    errors.dates = 'End date must be on or after the start date.'
  }

  if (form.maxStudents.trim()) {
    const maxStudents = Number(form.maxStudents)
    if (!Number.isInteger(maxStudents) || maxStudents < 1) {
      errors.maxStudents = 'Max students must be a positive whole number.'
    }
  }

  return Object.keys(errors).length === 0
}

function submit(): void {
  if (!validate()) return

  const building = form.building === 'Other' ? form.customBuilding.trim() : form.building

  emit('submit', {
    name: form.name.trim(),
    course: form.course,
    building,
    floor: form.floor.trim(),
    roomNumber: form.roomNumber.trim() || undefined,
    scheduleDays: [...form.days],
    startTime: form.startTime,
    endTime: form.endTime,
    startDate: form.startDate,
    endDate: form.endDate,
    maxStudents: form.maxStudents.trim() ? Number(form.maxStudents) : undefined,
  })
}
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="submit">
    <div class="card p-5 sm:p-6">
      <div class="flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-indigo-500" />
        <h3 class="text-base font-semibold text-slate-900">Class details</h3>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="managed-class-name" class="field-label">Class name</label>
          <input
            id="managed-class-name"
            v-model="form.name"
            type="text"
            class="field-input"
            placeholder="e.g. Frontend Fundamentals — Cohort 4"
            autocomplete="off"
          />
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>

        <div>
          <label for="managed-class-course" class="field-label">Course</label>
          <select id="managed-class-course" v-model="form.course" class="field-input">
            <option v-for="course in COURSE_NAMES" :key="course" :value="course">
              {{ course }}
            </option>
          </select>
          <p v-if="errors.course" class="field-error">{{ errors.course }}</p>
        </div>

        <div>
          <label for="managed-class-building" class="field-label">Building</label>
          <select id="managed-class-building" v-model="form.building" class="field-input">
            <option v-for="building in BUILDING_NAMES" :key="building" :value="building">
              {{ building }}
            </option>
            <option value="Other">Other</option>
          </select>
          <input
            v-if="form.building === 'Other'"
            v-model="form.customBuilding"
            type="text"
            class="field-input mt-2"
            placeholder="Building name"
            aria-label="Custom building name"
          />
          <p v-if="errors.building" class="field-error">{{ errors.building }}</p>
        </div>

        <div>
          <label for="managed-class-floor" class="field-label">Floor</label>
          <input
            id="managed-class-floor"
            v-model="form.floor"
            type="number"
            min="1"
            max="100"
            class="field-input"
            placeholder="3"
          />
          <p v-if="errors.floor" class="field-error">{{ errors.floor }}</p>
        </div>

        <div>
          <label for="managed-class-room" class="field-label">
            Room number <span class="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="managed-class-room"
            v-model="form.roomNumber"
            type="text"
            class="field-input"
            placeholder="B3-12"
          />
        </div>
      </div>
    </div>

    <div class="card p-5 sm:p-6">
      <div class="flex items-center gap-2">
        <CalendarDays class="h-5 w-5 text-indigo-500" />
        <h3 class="text-base font-semibold text-slate-900">Schedule</h3>
      </div>

      <div class="mt-5">
        <p class="field-label">Day(s) of the week</p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="day in WEEKDAY_NAMES"
            :key="day"
            :class="[
              'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
              form.days.includes(day)
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700',
            ]"
          >
            <input
              v-model="form.days"
              type="checkbox"
              :value="day"
              class="sr-only"
              :aria-label="day"
            />
            {{ day }}
          </label>
        </div>
        <p v-if="errors.days" class="field-error">{{ errors.days }}</p>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="managed-class-start-time" class="field-label">Start time</label>
          <input
            id="managed-class-start-time"
            v-model="form.startTime"
            type="time"
            class="field-input"
          />
        </div>
        <div>
          <label for="managed-class-end-time" class="field-label">End time</label>
          <input
            id="managed-class-end-time"
            v-model="form.endTime"
            type="time"
            class="field-input"
          />
        </div>
      </div>
      <p v-if="errors.time" class="field-error">{{ errors.time }}</p>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="managed-class-start-date" class="field-label">Start date</label>
          <input
            id="managed-class-start-date"
            v-model="form.startDate"
            type="date"
            class="field-input"
          />
        </div>
        <div>
          <label for="managed-class-end-date" class="field-label">End date</label>
          <input
            id="managed-class-end-date"
            v-model="form.endDate"
            type="date"
            class="field-input"
          />
        </div>
      </div>
      <p v-if="errors.dates" class="field-error">{{ errors.dates }}</p>
    </div>

    <div class="card p-5 sm:p-6">
      <div class="flex items-center gap-2">
        <Users class="h-5 w-5 text-indigo-500" />
        <h3 class="text-base font-semibold text-slate-900">Capacity</h3>
      </div>

      <div class="mt-5 max-w-xs">
        <label for="managed-class-max-students" class="field-label">
          Max students <span class="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="managed-class-max-students"
          v-model="form.maxStudents"
          type="number"
          min="1"
          class="field-input"
          placeholder="30"
        />
        <p v-if="errors.maxStudents" class="field-error">{{ errors.maxStudents }}</p>
      </div>
    </div>

    <p
      v-if="error"
      class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <BaseButton variant="secondary" type="button" :disabled="submitting" @click="emit('cancel')">
        Cancel
      </BaseButton>
      <BaseButton type="submit" :disabled="submitting">
        <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
        <Save v-else class="h-4 w-4" />
        {{ submitting ? 'Saving…' : 'Create class' }}
      </BaseButton>
    </div>

    <p class="flex items-center gap-1.5 text-xs text-slate-400">
      <MapPin class="h-3.5 w-3.5" />
      Location and schedule are shown to students on the class card.
      <Clock class="ml-2 h-3.5 w-3.5" />
      QR registration opens after the class is created.
    </p>
  </form>
</template>
