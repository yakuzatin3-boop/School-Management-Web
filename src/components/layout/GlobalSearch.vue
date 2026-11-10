<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Search,
  Settings,
  Users,
  Wallet,
} from 'lucide-vue-next'

import BaseModal from '@/components/ui/BaseModal.vue'
import { fullName } from '@/services/format'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useStudentsStore } from '@/stores/students'
import { useTeachersStore } from '@/stores/teachers'
import type { RoleKey } from '@/types'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  to: string
  group: string
  icon: Component
  roles?: RoleKey[]
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const auth = useAuthStore()
const studentsStore = useStudentsStore()
const teachersStore = useTeachersStore()
const classesStore = useClassesStore()

const query = ref('')
const input = ref<HTMLInputElement | null>(null)

const quickLinks: SearchResult[] = [
  {
    id: 'page-dashboard',
    title: 'Dashboard',
    subtitle: 'Overview and key metrics',
    to: '/',
    group: 'Pages',
    icon: LayoutDashboard,
  },
  {
    id: 'page-students',
    title: 'Students',
    subtitle: 'Student records and enrollment',
    to: '/students',
    group: 'Pages',
    icon: GraduationCap,
    roles: ['admin', 'teacher'],
  },
  {
    id: 'page-teachers',
    title: 'Teachers',
    subtitle: 'Teacher profiles and assignments',
    to: '/teachers',
    group: 'Pages',
    icon: Users,
    roles: ['admin'],
  },
  {
    id: 'page-classes',
    title: 'Classes',
    subtitle: 'Class rosters, rooms, and capacity',
    to: '/classes',
    group: 'Pages',
    icon: BookOpen,
    roles: ['admin', 'teacher'],
  },
  {
    id: 'page-attendance',
    title: 'Attendance',
    subtitle: 'Review daily attendance',
    to: '/attendance',
    group: 'Pages',
    icon: CalendarCheck,
  },
  {
    id: 'page-grades',
    title: 'Grades',
    subtitle: 'Assessment scores and averages',
    to: '/grades',
    group: 'Pages',
    icon: ClipboardList,
  },
  {
    id: 'page-timetable',
    title: 'Timetable',
    subtitle: 'Weekly lesson plan',
    to: '/timetable',
    group: 'Pages',
    icon: CalendarDays,
  },
  {
    id: 'page-fees',
    title: 'Fees',
    subtitle: 'Invoices and payments',
    to: '/fees',
    group: 'Pages',
    icon: Wallet,
  },
  {
    id: 'page-announcements',
    title: 'Announcements',
    subtitle: 'School news and notices',
    to: '/announcements',
    group: 'Pages',
    icon: Megaphone,
  },
  {
    id: 'page-settings',
    title: 'Settings',
    subtitle: 'School and account preferences',
    to: '/settings',
    group: 'Pages',
    icon: Settings,
  },
]

const allowedQuickLinks = computed(() =>
  quickLinks.filter(
    (link) => !link.roles || (auth.role !== null && link.roles.includes(auth.role)),
  ),
)

const canSeePeople = computed(() => auth.isStaff)

const results = computed<SearchResult[]>(() => {
  const term = query.value.trim().toLowerCase()

  if (!term) return allowedQuickLinks.value

  const studentResults: SearchResult[] = canSeePeople.value
    ? studentsStore.students
        .filter((student) =>
          [fullName(student.firstName, student.lastName), student.email, student.className]
            .join(' ')
            .toLowerCase()
            .includes(term),
        )
        .slice(0, 4)
        .map((student) => ({
          id: student.id,
          title: fullName(student.firstName, student.lastName),
          subtitle: `${student.grade} · Class ${student.className}`,
          to: `/students?q=${encodeURIComponent(fullName(student.firstName, student.lastName))}`,
          group: 'Students',
          icon: GraduationCap,
        }))
    : []

  const teacherResults: SearchResult[] = auth.isAdmin
    ? teachersStore.teachers
        .filter((teacher) =>
          [fullName(teacher.firstName, teacher.lastName), teacher.email, teacher.subject]
            .join(' ')
            .toLowerCase()
            .includes(term),
        )
        .slice(0, 4)
        .map((teacher) => ({
          id: teacher.id,
          title: fullName(teacher.firstName, teacher.lastName),
          subtitle: teacher.subject,
          to: `/teachers?q=${encodeURIComponent(fullName(teacher.firstName, teacher.lastName))}`,
          group: 'Teachers',
          icon: Users,
        }))
    : []

  const classResults: SearchResult[] = canSeePeople.value
    ? classesStore.classes
        .filter((schoolClass) =>
          [schoolClass.name, schoolClass.grade, schoolClass.room]
            .join(' ')
            .toLowerCase()
            .includes(term),
        )
        .slice(0, 4)
        .map((schoolClass) => ({
          id: schoolClass.id,
          title: `Class ${schoolClass.name}`,
          subtitle: `${schoolClass.grade} · ${schoolClass.room}`,
          to: `/classes?q=${encodeURIComponent(schoolClass.name)}`,
          group: 'Classes',
          icon: BookOpen,
        }))
    : []

  const pageResults = allowedQuickLinks.value.filter(
    (link) => link.title.toLowerCase().includes(term) || link.subtitle.toLowerCase().includes(term),
  )

  return [...studentResults, ...teacherResults, ...classResults, ...pageResults]
})

function navigate(result: SearchResult): void {
  emit('close')
  router.push(result.to)
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      query.value = ''
      return
    }

    await nextTick()
    input.value?.focus()
  },
)
</script>

<template>
  <BaseModal
    :open="open"
    title="Search"
    description="Find students, teachers, classes, or jump to a page."
    wide
    @close="emit('close')"
  >
    <div class="relative">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        ref="input"
        v-model="query"
        type="search"
        class="field-input pl-10"
        placeholder="Type a name, class, subject, or page…"
        aria-label="Global search"
        @keydown.enter="results[0] && navigate(results[0])"
      />
    </div>

    <div class="mt-4 space-y-1">
      <button
        v-for="result in results"
        :key="result.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100"
        @click="navigate(result)"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"
        >
          <component :is="result.icon" class="h-4 w-4" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-slate-800">{{ result.title }}</span>
          <span class="block truncate text-xs text-slate-500">{{ result.subtitle }}</span>
        </span>
        <span
          class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
        >
          {{ result.group }}
        </span>
      </button>

      <p v-if="results.length === 0" class="py-8 text-center text-sm text-slate-500">
        No matches for “{{ query }}”. Try a different name or class.
      </p>
    </div>
  </BaseModal>
</template>
