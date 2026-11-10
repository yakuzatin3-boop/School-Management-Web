<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CalendarDays, Clock, MapPin, Pencil, Plus, Trash2, UserRound } from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useTeachersStore } from '@/stores/teachers'
import { useTimetableStore } from '@/stores/timetable'
import { useToastStore } from '@/stores/toast'
import type { TimetableEntry, Weekday } from '@/types'

interface LessonFormState {
  day: Weekday
  period: number
  classId: string
  subject: string
  teacherId: string
  room: string
}

const auth = useAuthStore()
const classesStore = useClassesStore()
const teachersStore = useTeachersStore()
const timetableStore = useTimetableStore()
const toast = useToastStore()

const weekdays: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const periods = [1, 2, 3, 4, 5, 6]
const periodTimes: Record<number, string> = {
  1: '08:00',
  2: '09:00',
  3: '10:00',
  4: '11:00',
  5: '13:00',
  6: '14:00',
}

const subjects = [
  'Mathematics',
  'English',
  'Physics',
  'Computer Science',
  'Biology',
  'History',
  'Chemistry',
  'Geography',
  'Art',
  'Music',
]

const subjectStyles: Record<string, string> = {
  Mathematics: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  English: 'border-sky-100 bg-sky-50 text-sky-700',
  Physics: 'border-violet-100 bg-violet-50 text-violet-700',
  'Computer Science': 'border-emerald-100 bg-emerald-50 text-emerald-700',
  Biology: 'border-lime-100 bg-lime-50 text-lime-700',
  History: 'border-amber-100 bg-amber-50 text-amber-700',
}

const selectedClassId = ref(classesStore.classes[0]?.id ?? '')
const selectedClass = computed(() =>
  classesStore.classes.find((schoolClass) => schoolClass.id === selectedClassId.value),
)

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

function emptyForm(): LessonFormState {
  return {
    day: 'Monday',
    period: 1,
    classId: selectedClassId.value,
    subject: 'Mathematics',
    teacherId: teachersStore.teachers[0]?.id ?? '',
    room: selectedClass.value?.room ?? '',
  }
}

const form = reactive<LessonFormState>(emptyForm())

function styleFor(subject: string): string {
  return subjectStyles[subject] ?? 'border-slate-200 bg-slate-50 text-slate-700'
}

function cell(day: Weekday, period: number): TimetableEntry | undefined {
  return timetableStore.forCell(selectedClassId.value, day, period)
}

function teacherName(teacherId: string): string {
  return teachersStore.name(teacherId)
}

function openCreate(day: Weekday = 'Monday', period = 1): void {
  Object.assign(form, emptyForm(), { day, period })
  editingId.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(entry: TimetableEntry): void {
  Object.assign(form, {
    day: entry.day,
    period: entry.period,
    classId: entry.classId,
    subject: entry.subject,
    teacherId: entry.teacherId,
    room: entry.room,
  })
  editingId.value = entry.id
  formError.value = ''
  modalOpen.value = true
}

function editCell(day: Weekday, period: number): void {
  const entry = cell(day, period)
  if (entry) openEdit(entry)
}

function validate(): boolean {
  formError.value = ''

  if (!form.classId) {
    formError.value = 'Choose a class for this lesson.'
    return false
  }

  if (!form.subject.trim()) {
    formError.value = 'Enter the lesson subject.'
    return false
  }

  if (!form.teacherId) {
    formError.value = 'Assign a teacher to this lesson.'
    return false
  }

  return true
}

function submit(): void {
  if (!validate()) return

  const payload = {
    day: form.day,
    period: form.period,
    classId: form.classId,
    subject: form.subject.trim(),
    teacherId: form.teacherId,
    room: form.room.trim() || 'Room TBC',
  }

  const action = editingId.value
    ? timetableStore.update(editingId.value, payload)
    : timetableStore.create(payload)

  action
    .then(() => {
      toast.success(editingId.value ? 'Lesson updated.' : 'Lesson saved to the timetable.')
      modalOpen.value = false
    })
    .catch((error: unknown) => {
      formError.value = error instanceof Error ? error.message : 'Unable to save this lesson.'
    })
}

function remove(): void {
  if (!editingId.value) return

  timetableStore
    .remove(editingId.value)
    .then(() => {
      toast.success('Lesson removed.')
      modalOpen.value = false
    })
    .catch((error: unknown) => {
      formError.value = error instanceof Error ? error.message : 'Unable to remove this lesson.'
    })
}

/* ------------------------------------------------------------------ */
/* Student view                                                        */
/* ------------------------------------------------------------------ */

function studentCells(day: Weekday, period: number): TimetableEntry[] {
  return timetableStore.entries
    .filter((entry) => entry.day === day && entry.period === period)
    .sort((a, b) => (a.className ?? '').localeCompare(b.className ?? ''))
}

const studentClassNames = computed(() =>
  [...new Set(timetableStore.entries.map((entry) => entry.className).filter(Boolean))].sort(),
)

const studentSubjects = computed(
  () => new Set(timetableStore.entries.map((entry) => entry.subject)).size,
)

const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()) as Weekday

onMounted(async () => {
  if (auth.isStudent) {
    await timetableStore.load()
    return
  }

  await Promise.all([
    classesStore.load(),
    teachersStore.load(),
    timetableStore.load(),
  ])

  if (!selectedClassId.value) {
    selectedClassId.value = classesStore.classes[0]?.id ?? ''
  }

  Object.assign(form, emptyForm())
})

watch(selectedClassId, () => {
  if (!editingId.value) Object.assign(form, emptyForm())
})
</script>

<template>
  <div class="space-y-6">
    <!-- Student: read-only weekly schedule -->
    <template v-if="auth.isStudent">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">My timetable</h2>
          <p class="mt-1 text-sm text-slate-500">
            Your weekly lesson schedule, including teachers and rooms.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <BaseBadge v-for="name in studentClassNames" :key="name" tone="info">
            {{ name }}
          </BaseBadge>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Lessons per week</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ timetableStore.entries.length }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Subjects</p>
          <p class="mt-1 text-2xl font-bold text-indigo-600">{{ studentSubjects }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Today</p>
          <p class="mt-1 text-2xl font-bold text-emerald-600">{{ today }}</p>
        </div>
      </div>

      <div v-if="timetableStore.entries.length > 0" class="card overflow-x-auto">
        <table class="min-w-[900px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th
                class="sticky left-0 z-10 w-28 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Period
              </th>
              <th
                v-for="day in weekdays"
                :key="day"
                :class="[
                  'border-b border-l border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wider',
                  day === today ? 'text-indigo-600' : 'text-slate-500',
                ]"
              >
                {{ day }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="period in periods" :key="period">
              <th class="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 text-left">
                <p class="text-sm font-semibold text-slate-800">Period {{ period }}</p>
                <p class="text-xs font-normal text-slate-500">{{ periodTimes[period] }}</p>
              </th>
              <td
                v-for="day in weekdays"
                :key="`${day}-${period}`"
                class="border-b border-l border-slate-100 p-1.5 align-top"
              >
                <div v-if="studentCells(day, period).length > 0" class="space-y-1.5">
                  <div
                    v-for="entry in studentCells(day, period)"
                    :key="entry.id"
                    :class="[
                      'flex h-full min-h-[86px] w-full flex-col rounded-lg border p-2.5 text-left',
                      styleFor(entry.subject),
                    ]"
                  >
                    <span class="text-xs font-semibold leading-tight">{{ entry.subject }}</span>
                    <span class="mt-auto space-y-0.5 pt-2 text-[11px] opacity-80">
                      <span class="flex items-center gap-1">
                        <UserRound class="h-3 w-3" />
                        {{ entry.teacherName || teacherName(entry.teacherId) }}
                      </span>
                      <span class="flex items-center gap-1">
                        <MapPin class="h-3 w-3" />
                        {{ entry.room }}
                      </span>
                      <span v-if="entry.className" class="flex items-center gap-1">
                        <CalendarDays class="h-3 w-3" />
                        {{ entry.className }}
                      </span>
                    </span>
                  </div>
                </div>
                <div v-else class="flex h-full min-h-[86px] w-full items-center justify-center rounded-lg border border-dashed border-slate-100 text-slate-300">
                  <Clock class="h-4 w-4" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <CalendarDays class="h-6 w-6" />
        </div>
        <h3 class="mt-4 text-sm font-semibold text-slate-900">No timetable published yet</h3>
        <p class="mt-1 max-w-sm text-sm text-slate-500">
          Your schedule will appear here once the school publishes its classes.
        </p>
      </div>
    </template>

    <!-- Staff: manage timetable -->
    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Timetable</h2>
          <p class="mt-1 text-sm text-slate-500">
            Weekly lesson plan by class. Click a slot to add or edit a lesson.
          </p>
        </div>
        <BaseButton @click="openCreate()">
          <Plus class="h-4 w-4" />
          Add lesson
        </BaseButton>
      </div>

      <div class="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="w-full sm:w-64">
            <label for="timetable-class" class="field-label">Class</label>
            <select id="timetable-class" v-model="selectedClassId" class="field-input">
              <option
                v-for="schoolClass in classesStore.classes"
                :key="schoolClass.id"
                :value="schoolClass.id"
              >
                {{ schoolClass.name }} · {{ schoolClass.grade }}
              </option>
            </select>
          </div>
          <div class="text-sm text-slate-500">
            <p class="font-medium text-slate-700">{{ selectedClass?.room }}</p>
            <p class="text-xs">{{ teachersStore.name(selectedClass?.teacherId ?? '') }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span class="flex items-center gap-1.5">
            <CalendarDays class="h-3.5 w-3.5" />
            Monday–Friday
          </span>
          <span class="flex items-center gap-1.5">
            <Clock class="h-3.5 w-3.5" />
            6 periods
          </span>
        </div>
      </div>

      <div class="card overflow-x-auto">
        <table class="min-w-[900px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th
                class="sticky left-0 z-10 w-28 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Period
              </th>
              <th
                v-for="day in weekdays"
                :key="day"
                class="border-b border-l border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {{ day }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="period in periods" :key="period">
              <th class="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 text-left">
                <p class="text-sm font-semibold text-slate-800">Period {{ period }}</p>
                <p class="text-xs font-normal text-slate-500">{{ periodTimes[period] }}</p>
              </th>
              <td
                v-for="day in weekdays"
                :key="`${day}-${period}`"
                class="border-b border-l border-slate-100 p-1.5 align-top"
              >
                <button
                  v-if="cell(day, period)"
                  type="button"
                  :class="[
                    'group flex h-full min-h-[86px] w-full flex-col rounded-lg border p-2.5 text-left transition hover:shadow-sm',
                    styleFor(cell(day, period)?.subject ?? ''),
                  ]"
                  @click="editCell(day, period)"
                >
                  <span class="flex items-start justify-between gap-2">
                    <span class="text-xs font-semibold leading-tight">
                      {{ cell(day, period)?.subject }}
                    </span>
                    <Pencil class="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-70" />
                  </span>
                  <span class="mt-auto space-y-0.5 pt-2 text-[11px] opacity-80">
                    <span class="flex items-center gap-1">
                      <UserRound class="h-3 w-3" />
                      {{ teacherName(cell(day, period)?.teacherId ?? '') }}
                    </span>
                    <span class="flex items-center gap-1">
                      <MapPin class="h-3 w-3" />
                      {{ cell(day, period)?.room }}
                    </span>
                  </span>
                </button>

                <button
                  v-else
                  type="button"
                  class="flex h-full min-h-[86px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-500"
                  :aria-label="`Add lesson on ${day} period ${period}`"
                  @click="openCreate(day, period)"
                >
                  <Plus class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BaseModal
        :open="modalOpen"
        :title="editingId ? 'Edit lesson' : 'Add lesson'"
        description="Lessons appear on the weekly timetable for the selected class."
        @close="modalOpen = false"
      >
        <form id="lesson-form" class="space-y-4" novalidate @submit.prevent="submit">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="lesson-day" class="field-label">Day</label>
              <select id="lesson-day" v-model="form.day" class="field-input">
                <option v-for="day in weekdays" :key="day" :value="day">{{ day }}</option>
              </select>
            </div>
            <div>
              <label for="lesson-period" class="field-label">Period</label>
              <select id="lesson-period" v-model.number="form.period" class="field-input">
                <option v-for="period in periods" :key="period" :value="period">
                  Period {{ period }} · {{ periodTimes[period] }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label for="lesson-class" class="field-label">Class</label>
            <select id="lesson-class" v-model="form.classId" class="field-input">
              <option
                v-for="schoolClass in classesStore.classes"
                :key="schoolClass.id"
                :value="schoolClass.id"
              >
                {{ schoolClass.name }} · {{ schoolClass.grade }}
              </option>
            </select>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="lesson-subject" class="field-label">Subject</label>
              <input
                id="lesson-subject"
                v-model="form.subject"
                type="text"
                class="field-input"
                list="lesson-subjects"
                placeholder="Mathematics"
              />
              <datalist id="lesson-subjects">
                <option v-for="subject in subjects" :key="subject" :value="subject" />
              </datalist>
            </div>
            <div>
              <label for="lesson-room" class="field-label">Room</label>
              <input
                id="lesson-room"
                v-model="form.room"
                type="text"
                class="field-input"
                placeholder="Room 101"
              />
            </div>
          </div>

          <div>
            <label for="lesson-teacher" class="field-label">Teacher</label>
            <select id="lesson-teacher" v-model="form.teacherId" class="field-input">
              <option v-for="teacher in teachersStore.teachers" :key="teacher.id" :value="teacher.id">
                {{ teacher.firstName }} {{ teacher.lastName }} · {{ teacher.subject }}
              </option>
            </select>
          </div>

          <p v-if="formError" class="field-error">{{ formError }}</p>
        </form>

        <template #footer>
          <div class="flex items-center justify-between gap-3">
            <BaseButton v-if="editingId" variant="danger" @click="remove">
              <Trash2 class="h-4 w-4" />
              Delete
            </BaseButton>
            <span v-else />

            <div class="flex gap-3">
              <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
              <BaseButton type="submit" form="lesson-form">
                {{ editingId ? 'Save lesson' : 'Add lesson' }}
              </BaseButton>
            </div>
          </div>
        </template>
      </BaseModal>
    </template>
  </div>
</template>
