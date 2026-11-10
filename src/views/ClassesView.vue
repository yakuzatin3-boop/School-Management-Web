<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  BookOpen,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { initials } from '@/services/format'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useCoursesStore } from '@/stores/courses'
import { useStudentsStore } from '@/stores/students'
import { useTeachersStore } from '@/stores/teachers'
import { useToastStore } from '@/stores/toast'
import type { SchoolClass } from '@/types'

interface ClassFormState {
  classCode: string
  name: string
  courseId: string
  teacherId: string
  status: 'active' | 'inactive'
}

const classesStore = useClassesStore()
const coursesStore = useCoursesStore()
const teachersStore = useTeachersStore()
const studentsStore = useStudentsStore()
const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const gradeFilter = ref('all')

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string') search.value = value
  },
)

const gradeOptions = computed(() => {
  return [...new Set(classesStore.classes.map((schoolClass) => schoolClass.grade))].sort()
})

function emptyForm(): ClassFormState {
  return {
    classCode: '',
    name: '',
    courseId: coursesStore.courses[0]?.id ?? '',
    teacherId: teachersStore.teachers[0]?.id ?? '',
    status: 'active',
  }
}

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive<ClassFormState>(emptyForm())

const filteredClasses = computed(() => {
  const term = search.value.trim().toLowerCase()

  return classesStore.classes.filter((schoolClass) => {
    const searchable = [
      schoolClass.name,
      schoolClass.grade,
      schoolClass.room,
      teachersStore.name(schoolClass.teacherId),
    ]
      .join(' ')
      .toLowerCase()

    const matchesTerm = !term || searchable.includes(term)
    const matchesGrade = gradeFilter.value === 'all' || schoolClass.grade === gradeFilter.value

    return matchesTerm && matchesGrade
  })
})

function enrolledCount(schoolClass: SchoolClass): number {
  return studentsStore.countByClass(schoolClass.name)
}

function occupancy(schoolClass: SchoolClass): number {
  if (schoolClass.capacity === 0) return 0

  return Math.min(100, Math.round((enrolledCount(schoolClass) / schoolClass.capacity) * 100))
}

function teacherInitials(teacherId: string): string {
  const teacher = teachersStore.find(teacherId)

  return teacher ? initials(teacher.firstName, teacher.lastName) : '—'
}

function openCreate(): void {
  Object.assign(form, emptyForm())
  editingId.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(schoolClass: SchoolClass): void {
  if (!auth.isAdmin) return

  Object.assign(form, {
    classCode: schoolClass.classCode ?? schoolClass.name,
    name: schoolClass.name,
    courseId: schoolClass.courseId ?? '',
    teacherId: schoolClass.teacherId,
    status: schoolClass.status ?? 'active',
  })
  editingId.value = schoolClass.id
  formError.value = ''
  modalOpen.value = true
}

function validate(): boolean {
  formError.value = ''

  if (!form.classCode.trim() || !form.name.trim()) {
    formError.value = 'A class code and name are required.'
    return false
  }

  if (!form.courseId) {
    formError.value = 'Create or choose a course before adding a class.'
    return false
  }

  return true
}

async function submit(): Promise<void> {
  if (!validate()) return

  const payload = {
    classCode: form.classCode.trim(),
    name: form.name.trim(),
    courseId: form.courseId,
    teacherId: form.teacherId,
    status: form.status,
  }

  try {
    if (editingId.value) {
      await classesStore.update(editingId.value, payload)
      toast.success('Class updated successfully.')
    } else {
      await classesStore.create(payload)
      toast.success('Class created successfully.')
    }
    modalOpen.value = false
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'Unable to save class.'
  }
}

const deleteTarget = ref<SchoolClass | null>(null)

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value || !auth.isAdmin) return

  try {
    await classesStore.remove(deleteTarget.value.id)
    toast.success('Class deactivated.')
    deleteTarget.value = null
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to deactivate class.')
  }
}

function clearFilters(): void {
  search.value = ''
  gradeFilter.value = 'all'
}

onMounted(async () => {
  try {
    await Promise.all([classesStore.load(), teachersStore.load(), coursesStore.load()])
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to load classes.')
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Classes</h2>
        <p class="mt-1 text-sm text-slate-500">
          Organize classes, assign teachers, and monitor capacity.
        </p>
      </div>
      <BaseButton @click="openCreate">
        <Plus class="h-4 w-4" />
        Add class
      </BaseButton>
    </div>

    <div class="card p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative flex-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="search"
            type="search"
            class="field-input pl-10"
            placeholder="Search by class, grade, room, or teacher…"
            aria-label="Search classes"
          />
        </div>
        <select v-model="gradeFilter" class="field-input sm:w-48" aria-label="Filter by grade">
          <option value="all">All grades</option>
          <option v-for="grade in gradeOptions" :key="grade" :value="grade">{{ grade }}</option>
        </select>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Showing {{ filteredClasses.length }} of {{ classesStore.total }} classes ·
        {{ classesStore.classes.reduce((sum, item) => sum + (item.enrollments?.filter((entry) => entry.status === 'active').length ?? 0), 0) }} active enrollments
      </p>
    </div>

    <div v-if="filteredClasses.length > 0" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="schoolClass in filteredClasses"
        :key="schoolClass.id"
        class="card flex flex-col p-5 transition hover:border-indigo-200 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
            >
              <BookOpen class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900">{{ schoolClass.name }}</h3>
              <BaseBadge tone="info">{{ schoolClass.grade }}</BaseBadge>
            </div>
          </div>
          <div v-if="auth.isAdmin" class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
              :aria-label="`Edit class ${schoolClass.name}`"
              @click="openEdit(schoolClass)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              :aria-label="`Delete class ${schoolClass.name}`"
              @click="deleteTarget = schoolClass"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <dl class="mt-5 space-y-2.5 text-sm">
          <div class="flex items-center gap-2 text-slate-600">
            <UserRound class="h-4 w-4 text-slate-400" />
            <span>{{ teachersStore.name(schoolClass.teacherId) }}</span>
          </div>
          <div class="flex items-center gap-2 text-slate-600">
            <MapPin class="h-4 w-4 text-slate-400" />
            <span>{{ schoolClass.room }}</span>
          </div>
          <div class="flex items-center gap-2 text-slate-600">
            <Clock class="h-4 w-4 text-slate-400" />
            <span>{{ schoolClass.schedule }}</span>
          </div>
        </dl>

        <div class="mt-auto pt-5">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1.5 font-medium text-slate-600">
              <div
                class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600"
              >
                {{ teacherInitials(schoolClass.teacherId) }}
              </div>
              Active enrollment
            </span>
            <span class="text-slate-500">
              {{ enrolledCount(schoolClass) }} / {{ schoolClass.capacity }}
            </span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              :class="[
                'h-full rounded-full transition-all duration-500',
                'bg-indigo-500',
              ]"
              :style="{ width: `${occupancy(schoolClass)}%` }"
            />
          </div>
          <p class="mt-1.5 text-xs text-slate-500">
            {{ schoolClass.status ?? 'active' }}
          </p>
        </div>
      </article>
    </div>

    <div v-else class="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <Users class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">No classes found</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">
        Try changing your search or filters, or create a new class to get started.
      </p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" @click="clearFilters">Clear filters</BaseButton>
        <BaseButton @click="openCreate">
          <Plus class="h-4 w-4" />
          Add class
        </BaseButton>
      </div>
    </div>

    <BaseModal
      :open="modalOpen"
      :title="editingId ? 'Edit class' : 'Add class'"
      description="Classes connect students, teachers, rooms, and schedules."
      @close="modalOpen = false"
    >
      <form id="class-form" class="space-y-4" novalidate @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="class-code" class="field-label">Class code</label>
            <input id="class-code" v-model="form.classCode" type="text" class="field-input" placeholder="CLS-9A" />
          </div>
          <div>
            <label for="class-name" class="field-label">Class name</label>
            <input
              id="class-name"
              v-model="form.name"
              type="text"
              class="field-input"
              placeholder="9A"
            />
          </div>
        </div>

        <div>
          <label for="class-course" class="field-label">Course</label>
          <select id="class-course" v-model="form.courseId" class="field-input">
            <option v-for="course in coursesStore.courses" :key="course.id" :value="course.id">{{ course.name }}</option>
          </select>
        </div>

        <div>
          <label for="class-teacher" class="field-label">Teacher</label>
          <select id="class-teacher" v-model="form.teacherId" class="field-input">
            <option value="">Unassigned</option>
            <option v-for="teacher in teachersStore.teachers" :key="teacher.id" :value="teacher.id">
              {{ teacher.firstName }} {{ teacher.lastName }}
            </option>
          </select>
        </div>

        <div>
          <label for="class-status" class="field-label">Status</label>
          <select id="class-status" v-model="form.status" class="field-input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <p v-if="formError" class="field-error">{{ formError }}</p>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" form="class-form">
            {{ editingId ? 'Save changes' : 'Add class' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <ConfirmDialog
      v-if="auth.isAdmin"
      :open="deleteTarget !== null"
      title="Deactivate class"
      message="This marks the class inactive. Student and teacher records are kept."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
