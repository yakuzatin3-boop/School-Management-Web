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
import { formatDate, fullName, initials } from '@/services/format'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useStudentsStore } from '@/stores/students'
import { useToastStore } from '@/stores/toast'
import type { Gender, Status, Student } from '@/types'

interface StudentFormState {
  studentNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: Gender
  classId: string
  status: Status
}

const studentsStore = useStudentsStore()
const classesStore = useClassesStore()
const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const statusFilter = ref('all')

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string') search.value = value
  },
)

function emptyForm(): StudentFormState {
  return {
    studentNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'female',
    classId: '',
    status: 'active',
  }
}

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive<StudentFormState>(emptyForm())

const filteredStudents = computed(() => {
  const term = search.value.trim().toLowerCase()

  return studentsStore.students.filter((student) => {
    const searchable = [
      student.firstName,
      student.lastName,
      student.email,
      student.studentNumber,
      student.className,
    ]
      .join(' ')
      .toLowerCase()

    const matchesTerm = !term || searchable.includes(term)
    const matchesStatus = statusFilter.value === 'all' || student.status === statusFilter.value

    return matchesTerm && matchesStatus
  })
})

function openCreate(): void {
  Object.assign(form, emptyForm())
  editingId.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(student: Student): void {
  if (!auth.isAdmin) return

  Object.assign(form, {
    studentNumber: student.studentNumber ?? '',
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    gender: student.gender,
    classId: student.classId ?? '',
    status: student.status,
  })
  editingId.value = student.id
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

  if (!editingId.value && !form.studentNumber.trim()) {
    formError.value = 'A student number is required.'
    return false
  }

  return true
}

async function submit(): Promise<void> {
  if (!validate()) return

  const payload = {
    studentNumber: form.studentNumber.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    gender: form.gender,
    classId: form.classId || undefined,
    status: form.status,
  }

  try {
    if (editingId.value) {
      await studentsStore.update(editingId.value, payload)
      toast.success('Student record updated.')
    } else {
      await studentsStore.create(payload)
      toast.success('Student added successfully.')
    }
    modalOpen.value = false
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'Unable to save student.'
  }
}

const deleteTarget = ref<Student | null>(null)

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value || !auth.isAdmin) return

  try {
    await studentsStore.remove(deleteTarget.value.id)
    toast.success('Student record deleted.')
    deleteTarget.value = null
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to delete student.')
  }
}

function clearFilters(): void {
  search.value = ''
  statusFilter.value = 'all'
}

function exportCsv(): void {
  downloadCsv(
    'students.csv',
    ['First name', 'Last name', 'Email', 'Phone', 'Gender', 'Grade', 'Class', 'Status', 'Enrolled'],
    filteredStudents.value.map((student) => [
      student.firstName,
      student.lastName,
      student.email,
      student.phone,
      student.gender,
      student.grade,
      student.className,
      student.status,
      student.enrolledAt,
    ]),
  )
  toast.success('Student list exported.')
}

onMounted(async () => {
  try {
    await Promise.all([studentsStore.load(), classesStore.load()])
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Unable to load students.')
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Students</h2>
        <p class="mt-1 text-sm text-slate-500">
          Manage enrollment, contact details, and class assignments.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton variant="secondary" @click="exportCsv">
          <Download class="h-4 w-4" />
          Export
        </BaseButton>
        <BaseButton @click="openCreate">
          <UserPlus class="h-4 w-4" />
          Add student
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
            placeholder="Search by name, email, grade, or class…"
            aria-label="Search students"
          />
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <select v-model="statusFilter" class="field-input sm:w-40" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <p class="mt-3 text-xs text-slate-500">
        Showing {{ filteredStudents.length }} of {{ studentsStore.total }} students
      </p>
    </div>

    <div class="card overflow-hidden">
      <div v-if="filteredStudents.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" class="px-5 py-3 font-semibold">Student</th>
              <th scope="col" class="px-5 py-3 font-semibold">Student / Class</th>
              <th scope="col" class="hidden px-5 py-3 font-semibold md:table-cell">Contact</th>
              <th scope="col" class="hidden px-5 py-3 font-semibold lg:table-cell">Enrolled</th>
              <th scope="col" class="px-5 py-3 font-semibold">Status</th>
              <th v-if="auth.isAdmin" scope="col" class="px-5 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="student in filteredStudents" :key="student.id" class="hover:bg-slate-50">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                  >
                    {{ initials(student.firstName, student.lastName) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-800">
                      {{ fullName(student.firstName, student.lastName) }}
                    </p>
                    <p class="truncate text-xs text-slate-500">{{ student.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3">
                <p class="font-medium text-slate-700">{{ student.studentNumber }}</p>
                <p class="text-xs text-slate-500">{{ student.className || 'Not enrolled' }}</p>
              </td>
              <td class="hidden px-5 py-3 md:table-cell">
                <p class="flex items-center gap-1.5 text-xs text-slate-600">
                  <Mail class="h-3.5 w-3.5 text-slate-400" />
                  {{ student.email }}
                </p>
                <p class="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <Phone class="h-3.5 w-3.5 text-slate-400" />
                  {{ student.phone || '—' }}
                </p>
              </td>
              <td class="hidden px-5 py-3 text-slate-600 lg:table-cell">
                {{ formatDate(student.enrolledAt) }}
              </td>
              <td class="px-5 py-3">
                <BaseBadge :tone="student.status === 'active' ? 'active' : 'inactive'">
                  {{ student.status }}
                </BaseBadge>
              </td>
              <td v-if="auth.isAdmin" class="px-5 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    :aria-label="`Edit ${fullName(student.firstName, student.lastName)}`"
                    @click="openEdit(student)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    :aria-label="`Delete ${fullName(student.firstName, student.lastName)}`"
                    @click="deleteTarget = student"
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
        <h3 class="mt-4 text-sm font-semibold text-slate-900">No students found</h3>
        <p class="mt-1 max-w-sm text-sm text-slate-500">
          Try changing your search or filters, or add a new student to get started.
        </p>
        <div class="mt-5 flex gap-3">
          <BaseButton variant="secondary" @click="clearFilters">Clear filters</BaseButton>
          <BaseButton @click="openCreate">
            <Plus class="h-4 w-4" />
            Add student
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseModal
      :open="modalOpen"
      :title="editingId ? 'Edit student' : 'Add student'"
      description="Keep student information accurate and up to date."
      @close="modalOpen = false"
    >
      <form id="student-form" class="space-y-4" novalidate @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="student-first-name" class="field-label">First name</label>
            <input
              id="student-first-name"
              v-model="form.firstName"
              type="text"
              class="field-input"
              placeholder="Maya"
            />
          </div>
          <div>
            <label for="student-last-name" class="field-label">Last name</label>
            <input
              id="student-last-name"
              v-model="form.lastName"
              type="text"
              class="field-input"
              placeholder="Thompson"
            />
          </div>
        </div>

        <div>
          <label for="student-number" class="field-label">Student number</label>
          <input
            id="student-number"
            v-model="form.studentNumber"
            type="text"
            class="field-input"
            :disabled="Boolean(editingId)"
            placeholder="STU-2026-001"
          />
        </div>

        <div>
          <label for="student-email" class="field-label">Email address</label>
          <input
            id="student-email"
            v-model="form.email"
            type="email"
            class="field-input"
            placeholder="maya.thompson@student.school.edu"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="student-phone" class="field-label">Phone</label>
            <input
              id="student-phone"
              v-model="form.phone"
              type="tel"
              class="field-input"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label for="student-gender" class="field-label">Gender</label>
            <select id="student-gender" v-model="form.gender" class="field-input">
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label for="student-class" class="field-label">Class enrollment</label>
          <select id="student-class" v-model="form.classId" class="field-input">
            <option value="">No class yet</option>
            <option v-for="schoolClass in classesStore.classes" :key="schoolClass.id" :value="schoolClass.id">
              {{ schoolClass.name }} · {{ schoolClass.grade }}
            </option>
          </select>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="student-status" class="field-label">Status</label>
            <select id="student-status" v-model="form.status" class="field-input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
        </div>

        <p v-if="formError" class="field-error">{{ formError }}</p>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" form="student-form">
            {{ editingId ? 'Save changes' : 'Add student' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <ConfirmDialog
      v-if="auth.isAdmin"
      :open="deleteTarget !== null"
      title="Delete student"
      :message="
        deleteTarget
          ? `This will permanently remove ${fullName(deleteTarget.firstName, deleteTarget.lastName)} from the student records.`
          : ''
      "
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
