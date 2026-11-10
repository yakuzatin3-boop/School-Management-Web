<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { downloadCsv } from '@/services/csv'
import { fullName, initials } from '@/services/format'
import { useClassesStore } from '@/stores/classes'
import { useCoursesStore } from '@/stores/courses'
import { useTeachersStore } from '@/stores/teachers'
import { useToastStore } from '@/stores/toast'
import type { Status, Teacher } from '@/types'

interface TeacherFormState {
  teacherNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  courseId: string
  status: Status
}

const teachersStore = useTeachersStore()
const classesStore = useClassesStore()
const coursesStore = useCoursesStore()
const toast = useToastStore()
const route = useRoute()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const subjectFilter = ref('all')
const statusFilter = ref('all')

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string') search.value = value
  },
)

function emptyForm(): TeacherFormState {
  return {
    teacherNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    courseId: coursesStore.courses[0]?.id ?? '',
    status: 'active',
  }
}

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive<TeacherFormState>(emptyForm())

const subjectOptions = computed(() => {
  const values = new Set(coursesStore.courses.map((course) => course.name))
  teachersStore.teachers.forEach((teacher) => values.add(teacher.subject))

  return [...values].sort()
})

const filteredTeachers = computed(() => {
  const term = search.value.trim().toLowerCase()

  return teachersStore.teachers.filter((teacher) => {
    const searchable = [teacher.firstName, teacher.lastName, teacher.email, teacher.subject]
      .join(' ')
      .toLowerCase()

    const matchesTerm = !term || searchable.includes(term)
    const matchesSubject = subjectFilter.value === 'all' || teacher.subject === subjectFilter.value
    const matchesStatus = statusFilter.value === 'all' || teacher.status === statusFilter.value

    return matchesTerm && matchesSubject && matchesStatus
  })
})

function classesFor(teacherId: string): number {
  return classesStore.classes.filter((schoolClass) => schoolClass.teacherId === teacherId).length
}

function openCreate(): void {
  Object.assign(form, emptyForm())
  editingId.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(teacher: Teacher): void {
  Object.assign(form, {
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    phone: teacher.phone,
    courseId: teacher.courseIds?.[0] ?? '',
    status: teacher.status,
  })
  editingId.value = teacher.id
  formError.value = ''
  modalOpen.value = true
}

function validate(): boolean {
  formError.value = ''

  if (!form.firstName.trim() || !form.lastName.trim()) {
    formError.value = 'First and last name are required.'
    return false
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    formError.value = 'Enter a valid email address.'
    return false
  }

  if (!editingId.value && !form.teacherNumber.trim()) {
    formError.value = 'A teacher number is required.'
    return false
  }

  if (!form.courseId) {
    formError.value = 'Choose a course for this teacher.'
    return false
  }

  return true
}

async function submit(): Promise<void> {
  if (!validate()) return

  const payload = {
    teacherNumber: form.teacherNumber.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    courseId: form.courseId,
    status: form.status,
  }

  try {
    if (editingId.value) {
      await teachersStore.update(editingId.value, payload)
      toast.success('Teacher record updated.')
    } else {
      await teachersStore.create(payload)
      toast.success('Teacher added successfully.')
    }
    modalOpen.value = false
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'Unable to save teacher.'
  }
}

const deleteTarget = ref<Teacher | null>(null)

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return

  try {
    await teachersStore.remove(deleteTarget.value.id)
    toast.success('Teacher record deactivated.')
    deleteTarget.value = null
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to deactivate teacher.')
  }
}

function clearFilters(): void {
  search.value = ''
  subjectFilter.value = 'all'
  statusFilter.value = 'all'
}

function exportCsv(): void {
  downloadCsv(
    'teachers.csv',
    ['First name', 'Last name', 'Email', 'Phone', 'Subject', 'Status', 'Hired'],
    filteredTeachers.value.map((teacher) => [
      teacher.firstName,
      teacher.lastName,
      teacher.email,
      teacher.phone,
      teacher.subject,
      teacher.status,
      teacher.hiredAt,
    ]),
  )
  toast.success('Teacher list exported.')
}

onMounted(async () => {
  try {
    await Promise.all([teachersStore.load(), classesStore.load(), coursesStore.load()])
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to load teachers.')
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Teachers</h2>
        <p class="mt-1 text-sm text-slate-500">
          Manage staff profiles, subjects, and class assignments.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton variant="secondary" @click="exportCsv">
          <Download class="h-4 w-4" />
          Export
        </BaseButton>
        <BaseButton @click="openCreate">
          <UserPlus class="h-4 w-4" />
          Add teacher
        </BaseButton>
      </div>
    </div>

    <div class="card p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="relative flex-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="search"
            type="search"
            class="field-input pl-10"
            placeholder="Search by name, email, or subject…"
            aria-label="Search teachers"
          />
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <select
            v-model="subjectFilter"
            class="field-input sm:w-48"
            aria-label="Filter by subject"
          >
            <option value="all">All subjects</option>
            <option v-for="subject in subjectOptions" :key="subject" :value="subject">
              {{ subject }}
            </option>
          </select>

          <select v-model="statusFilter" class="field-input sm:w-40" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <p class="mt-3 text-xs text-slate-500">
        Showing {{ filteredTeachers.length }} of {{ teachersStore.total }} teachers
      </p>
    </div>

    <div class="card overflow-hidden">
      <div v-if="filteredTeachers.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" class="px-5 py-3 font-semibold">Teacher</th>
              <th scope="col" class="px-5 py-3 font-semibold">Subject</th>
              <th scope="col" class="hidden px-5 py-3 font-semibold md:table-cell">Contact</th>
              <th scope="col" class="hidden px-5 py-3 font-semibold lg:table-cell">Teacher no.</th>
              <th scope="col" class="px-5 py-3 font-semibold">Status</th>
              <th scope="col" class="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="teacher in filteredTeachers" :key="teacher.id" class="hover:bg-slate-50">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
                  >
                    {{ initials(teacher.firstName, teacher.lastName) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-800">
                      {{ fullName(teacher.firstName, teacher.lastName) }}
                    </p>
                    <p class="truncate text-xs text-slate-500">{{ teacher.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3">
                <p class="font-medium text-slate-700">{{ teacher.subject }}</p>
                <p class="text-xs text-slate-500">
                  {{ classesFor(teacher.id) }} class{{ classesFor(teacher.id) === 1 ? '' : 'es' }}
                </p>
              </td>
              <td class="hidden px-5 py-3 md:table-cell">
                <p class="flex items-center gap-1.5 text-xs text-slate-600">
                  <Mail class="h-3.5 w-3.5 text-slate-400" />
                  {{ teacher.email }}
                </p>
                <p class="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <Phone class="h-3.5 w-3.5 text-slate-400" />
                  {{ teacher.phone || '—' }}
                </p>
              </td>
              <td class="hidden px-5 py-3 text-slate-600 lg:table-cell">
                {{ teacher.teacherNumber }}
              </td>
              <td class="px-5 py-3">
                <BaseBadge :tone="teacher.status === 'active' ? 'active' : 'inactive'">
                  {{ teacher.status }}
                </BaseBadge>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    :aria-label="`Edit ${fullName(teacher.firstName, teacher.lastName)}`"
                    @click="openEdit(teacher)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    :aria-label="`Delete ${fullName(teacher.firstName, teacher.lastName)}`"
                    @click="deleteTarget = teacher"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        >
          <Users class="h-6 w-6" />
        </div>
        <h3 class="mt-4 text-sm font-semibold text-slate-900">No teachers found</h3>
        <p class="mt-1 max-w-sm text-sm text-slate-500">
          Try changing your search or filters, or add a new teacher to get started.
        </p>
        <div class="mt-5 flex gap-3">
          <BaseButton variant="secondary" @click="clearFilters">Clear filters</BaseButton>
          <BaseButton @click="openCreate">
            <Plus class="h-4 w-4" />
            Add teacher
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseModal
      :open="modalOpen"
      :title="editingId ? 'Edit teacher' : 'Add teacher'"
      description="Staff details are used across class assignments and schedules."
      @close="modalOpen = false"
    >
      <form id="teacher-form" class="space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label for="teacher-number" class="field-label">Teacher number</label>
          <input
            id="teacher-number"
            v-model="form.teacherNumber"
            type="text"
            class="field-input"
            :disabled="Boolean(editingId)"
            placeholder="TCH-2026-001"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="teacher-first-name" class="field-label">First name</label>
            <input
              id="teacher-first-name"
              v-model="form.firstName"
              type="text"
              class="field-input"
              placeholder="Amara"
            />
          </div>
          <div>
            <label for="teacher-last-name" class="field-label">Last name</label>
            <input
              id="teacher-last-name"
              v-model="form.lastName"
              type="text"
              class="field-input"
              placeholder="Okafor"
            />
          </div>
        </div>

        <div>
          <label for="teacher-email" class="field-label">Email address</label>
          <input
            id="teacher-email"
            v-model="form.email"
            type="email"
            class="field-input"
            placeholder="amara.okafor@school.edu"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="teacher-phone" class="field-label">Phone</label>
            <input
              id="teacher-phone"
              v-model="form.phone"
              type="tel"
              class="field-input"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label for="teacher-subject" class="field-label">Course</label>
            <select
              id="teacher-subject"
              v-model="form.courseId"
              class="field-input"
            >
              <option
                v-for="course in coursesStore.courses"
                :key="course.id"
                :value="course.id"
              >
                {{ course.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="teacher-status" class="field-label">Status</label>
            <select id="teacher-status" v-model="form.status" class="field-input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On leave</option>
            </select>
          </div>
        </div>

        <p v-if="formError" class="field-error">{{ formError }}</p>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" form="teacher-form">
            {{ editingId ? 'Save changes' : 'Add teacher' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="Deactivate teacher"
      :message="
        deleteTarget
          ? `${fullName(deleteTarget.firstName, deleteTarget.lastName)} will be marked inactive.`
          : ''
      "
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
