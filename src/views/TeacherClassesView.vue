<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertCircle, BookOpen, Plus, Search, SlidersHorizontal, Users } from 'lucide-vue-next'

import ClassCard from '@/components/classes/ClassCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useClassStore } from '@/stores/classes'
import { COURSE_NAMES, type CourseName } from '@/types'

const classStore = useClassStore()

const search = ref('')
const courseFilter = ref<'all' | CourseName>('all')
const buildingFilter = ref('all')
const floorFilter = ref('all')
const error = ref('')

const courseOptions = computed(() => {
  const used = classStore.classes
    .map((schoolClass) => schoolClass.courseName)
    .filter((course): course is CourseName => Boolean(course))

  return [...new Set([...COURSE_NAMES, ...used])]
})

const buildingOptions = computed(() => {
  const used = classStore.classes
    .map((schoolClass) => schoolClass.building)
    .filter((building): building is string => Boolean(building) && building !== 'Unassigned')

  return [...new Set(used)].sort()
})

const floorOptions = computed(() => {
  const used = classStore.classes
    .map((schoolClass) => schoolClass.floor)
    .filter((floor): floor is string => Boolean(floor))

  return [...new Set(used)].sort((a, b) => Number(a) - Number(b))
})

const filteredClasses = computed(() => {
  const term = search.value.trim().toLowerCase()

  return classStore.classes.filter((schoolClass) => {
    const searchable = [
      schoolClass.name,
      schoolClass.courseName,
      schoolClass.building,
      schoolClass.floor,
      schoolClass.room,
      schoolClass.teacherName,
      schoolClass.schedule,
    ]
      .join(' ')
      .toLowerCase()

    const matchesTerm = !term || searchable.includes(term)
    const matchesCourse =
      courseFilter.value === 'all' || schoolClass.courseName === courseFilter.value
    const matchesBuilding =
      buildingFilter.value === 'all' || schoolClass.building === buildingFilter.value
    const matchesFloor = floorFilter.value === 'all' || schoolClass.floor === floorFilter.value

    return matchesTerm && matchesCourse && matchesBuilding && matchesFloor
  })
})

const hasFilters = computed(
  () =>
    search.value.trim() !== '' ||
    courseFilter.value !== 'all' ||
    buildingFilter.value !== 'all' ||
    floorFilter.value !== 'all',
)

const activeStudents = computed(() =>
  classStore.classes.reduce((sum, schoolClass) => sum + (schoolClass.studentCount ?? 0), 0),
)

function clearFilters(): void {
  search.value = ''
  courseFilter.value = 'all'
  buildingFilter.value = 'all'
  floorFilter.value = 'all'
}

async function loadClasses(): Promise<void> {
  error.value = ''
  try {
    await classStore.load(true)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to load classes.'
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
          Create classes, share registration QR codes, and run QR attendance.
        </p>
      </div>
      <RouterLink to="/teacher/classes/create">
        <BaseButton>
          <Plus class="h-4 w-4" />
          Create class
        </BaseButton>
      </RouterLink>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Classes</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ classStore.classes.length }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Active students</p>
        <p class="mt-1 text-2xl font-bold text-indigo-600">{{ activeStudents }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm font-medium text-slate-500">Showing</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ filteredClasses.length }}</p>
      </div>
    </div>

    <div class="card p-4">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <SlidersHorizontal class="h-4 w-4 text-slate-400" />
        Search and filter
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="relative sm:col-span-2 xl:col-span-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="search"
            type="search"
            class="field-input pl-10"
            placeholder="Search class, teacher, room…"
            aria-label="Search classes"
          />
        </div>

        <select v-model="courseFilter" class="field-input" aria-label="Filter by course">
          <option value="all">All courses</option>
          <option v-for="course in courseOptions" :key="course" :value="course">
            {{ course }}
          </option>
        </select>

        <select v-model="buildingFilter" class="field-input" aria-label="Filter by building">
          <option value="all">All buildings</option>
          <option v-for="building in buildingOptions" :key="building" :value="building">
            {{ building }}
          </option>
        </select>

        <select v-model="floorFilter" class="field-input" aria-label="Filter by floor">
          <option value="all">All floors</option>
          <option v-for="floor in floorOptions" :key="floor" :value="floor">
            Floor {{ floor }}
          </option>
        </select>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-slate-500">
          Showing {{ filteredClasses.length }} of {{ classStore.classes.length }} classes
        </p>
        <button
          v-if="hasFilters"
          type="button"
          class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>
    </div>

    <div v-if="classStore.loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="index in 6" :key="index" class="card space-y-4 p-5">
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
          <div class="h-3 w-44 animate-pulse rounded bg-slate-100" />
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
      <h3 class="mt-4 text-sm font-semibold text-slate-900">Unable to load classes</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ error }}</p>
      <BaseButton variant="secondary" class="mt-5" @click="loadClasses">Try again</BaseButton>
    </div>

    <div v-else-if="filteredClasses.length > 0" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ClassCard
        v-for="schoolClass in filteredClasses"
        :key="schoolClass.id"
        :school-class="schoolClass"
        :to="`/teacher/classes/${schoolClass.id}`"
      />
    </div>

    <div v-else class="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <BookOpen class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">
        {{ hasFilters ? 'No classes match your filters' : 'No classes yet' }}
      </h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">
        {{
          hasFilters
            ? 'Try a different course, building, floor, or search term.'
            : 'Create your first class to generate a registration QR code.'
        }}
      </p>
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <BaseButton v-if="hasFilters" variant="secondary" @click="clearFilters">
          Clear filters
        </BaseButton>
        <RouterLink v-else to="/teacher/classes/create">
          <BaseButton>
            <Plus class="h-4 w-4" />
            Create class
          </BaseButton>
        </RouterLink>
      </div>
      <p v-if="!hasFilters" class="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        <Users class="h-3.5 w-3.5" />
        Students can join by scanning your registration QR.
      </p>
    </div>
  </div>
</template>
