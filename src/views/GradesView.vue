<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Award, BookOpen, ClipboardList, Save, TrendingUp, UserRound } from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { fullName, initials } from '@/services/format'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useGradesStore } from '@/stores/grades'
import { useSettingsStore } from '@/stores/settings'
import { useStudentsStore } from '@/stores/students'
import { useToastStore } from '@/stores/toast'
import type { GradeRecord } from '@/types'

const auth = useAuthStore()
const gradesStore = useGradesStore()
const classesStore = useClassesStore()
const studentsStore = useStudentsStore()
const settingsStore = useSettingsStore()
const toast = useToastStore()

const subjects = ['Mathematics', 'English', 'Physics', 'Computer Science', 'Biology', 'History']
const assessments = ['Quiz 1', 'Quiz 2', 'Assignment 1', 'Midterm', 'Final Exam']

const selectedClass = ref(classesStore.classes[0]?.name ?? '')
const selectedSubject = ref('Mathematics')
const selectedAssessment = ref('Midterm')
const scores = reactive<Record<string, number | ''>>({})

const roster = computed(() =>
  studentsStore.students.filter(
    (student) => student.className === selectedClass.value && student.status === 'active',
  ),
)

const numericScores = computed(() =>
  roster.value
    .map((student) => scores[student.id])
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score)),
)

const average = computed(() => {
  if (numericScores.value.length === 0) return 0

  return Math.round(
    numericScores.value.reduce((sum, score) => sum + score, 0) / numericScores.value.length,
  )
})

const highest = computed(() =>
  numericScores.value.length > 0 ? Math.max(...numericScores.value) : 0,
)
const lowest = computed(() =>
  numericScores.value.length > 0 ? Math.min(...numericScores.value) : 0,
)

function loadScores(): void {
  Object.keys(scores).forEach((key) => {
    delete scores[key]
  })

  roster.value.forEach((student) => {
    scores[student.id] =
      gradesStore.scoreFor(
        student.id,
        selectedClass.value,
        selectedSubject.value,
        selectedAssessment.value,
      ) ?? ''
  })
}

function scoreFor(studentId: string): number | '' {
  return scores[studentId] ?? ''
}

function letterFor(score: number | ''): string {
  if (score === '' || !Number.isFinite(score)) return '—'

  return gradesStore.letterFor(score)
}

function save(): void {
  const invalid = roster.value.some((student) => {
    const score = scores[student.id]

    return score !== '' && (typeof score !== 'number' || score < 0 || score > 100)
  })

  if (invalid) {
    toast.error('Scores must be between 0 and 100.')
    return
  }

  const entries = roster.value
    .map((student) => ({ studentId: student.id, score: scores[student.id] }))
    .filter(
      (entry): entry is { studentId: string; score: number } => typeof entry.score === 'number',
    )

  if (entries.length === 0) {
    toast.error('Enter at least one score before saving.')
    return
  }

  gradesStore
    .saveAssessment(
      selectedClass.value,
      selectedSubject.value,
      selectedAssessment.value,
      settingsStore.settings.term,
      entries,
    )
    .then(() => {
      toast.success(
        `${selectedSubject.value} ${selectedAssessment.value} grades saved for Class ${selectedClass.value}.`,
      )
    })
    .catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save grades.')
    })
}

/* ------------------------------------------------------------------ */
/* Student view                                                        */
/* ------------------------------------------------------------------ */

const letterTone = (letter: string): 'active' | 'info' | 'warning' | 'danger' | 'neutral' => {
  if (letter === 'A') return 'active'
  if (letter === 'B') return 'info'
  if (letter === 'C') return 'warning'
  if (letter === 'D' || letter === 'F') return 'danger'

  return 'neutral'
}

const studentRecords = computed(() =>
  [...gradesStore.records].sort(
    (a, b) =>
      a.subject.localeCompare(b.subject) ||
      a.assessment.localeCompare(b.assessment) ||
      a.term.localeCompare(b.term),
  ),
)

const studentAverage = computed(() => {
  if (studentRecords.value.length === 0) return 0

  return Math.round(
    studentRecords.value.reduce((sum, record) => sum + record.score, 0) /
      studentRecords.value.length,
  )
})

const subjectBreakdown = computed(() => {
  const grouped = new Map<string, number[]>()

  studentRecords.value.forEach((record) => {
    const list = grouped.get(record.subject) ?? []
    list.push(record.score)
    grouped.set(record.subject, list)
  })

  return [...grouped.entries()]
    .map(([subject, scores]) => {
      const subjectAverage = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)

      return {
        subject,
        count: scores.length,
        average: subjectAverage,
        letter: gradesStore.letterFor(subjectAverage),
      }
    })
    .sort((a, b) => b.average - a.average)
})

const bestSubject = computed(() => subjectBreakdown.value[0])

const studentDistribution = computed(() => {
  const buckets: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }

  studentRecords.value.forEach((record) => {
    const key = gradesStore.letterFor(record.score)
    buckets[key] = (buckets[key] ?? 0) + 1
  })

  return Object.entries(buckets).map(([grade, count]) => ({
    grade,
    count,
    percent:
      studentRecords.value.length === 0 ? 0 : Math.round((count / studentRecords.value.length) * 100),
  }))
})

const distributionColour: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-sky-500',
  C: 'bg-amber-500',
  D: 'bg-orange-500',
  F: 'bg-rose-500',
}

onMounted(async () => {
  if (auth.isStudent) {
    await Promise.all([gradesStore.load(), settingsStore.load()])
    return
  }

  await Promise.all([
    studentsStore.load(),
    classesStore.load(),
    gradesStore.load(),
    settingsStore.load(),
  ])

  if (!selectedClass.value) {
    selectedClass.value = classesStore.classes[0]?.name ?? ''
  }

  loadScores()
})
watch([selectedClass, selectedSubject, selectedAssessment], loadScores)

function termLabel(record: GradeRecord): string {
  return record.term || settingsStore.settings.term
}
</script>

<template>
  <div class="space-y-6">
    <!-- Student: personal results -->
    <template v-if="auth.isStudent">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">My grades</h2>
          <p class="mt-1 text-sm text-slate-500">
            Every recorded score across your subjects and assessments.
          </p>
        </div>
        <BaseBadge :tone="letterTone(gradesStore.letterFor(studentAverage))">
          <Award class="mr-1 h-3 w-3" />
          {{ studentAverage }}% overall
        </BaseBadge>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Overall average</p>
          <p class="mt-1 text-2xl font-bold text-indigo-600">{{ studentAverage }}%</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Subjects</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ subjectBreakdown.length }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Assessments</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ studentRecords.length }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Best subject</p>
          <p class="mt-1 truncate text-lg font-bold text-emerald-600">
            {{ bestSubject?.subject ?? '—' }}
          </p>
          <p class="text-xs text-slate-500">{{ bestSubject ? `${bestSubject.average}%` : 'No scores yet' }}</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <section class="card p-5 lg:col-span-2">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold text-slate-900">Performance by subject</h3>
              <p class="text-xs text-slate-500">Average score across all your assessments</p>
            </div>
            <BookOpen class="h-4 w-4 text-slate-400" />
          </div>

          <div v-if="subjectBreakdown.length > 0" class="mt-5 space-y-4">
            <div v-for="row in subjectBreakdown" :key="row.subject">
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 font-medium text-slate-700">
                  {{ row.subject }}
                  <BaseBadge :tone="letterTone(row.letter)">{{ row.letter }}</BaseBadge>
                </span>
                <span class="text-slate-500">{{ row.average }}% · {{ row.count }} score{{ row.count === 1 ? '' : 's' }}</span>
              </div>
              <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                  :style="{ width: `${row.average}%` }"
                />
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-14 text-center">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ClipboardList class="h-6 w-6" />
            </div>
            <h3 class="mt-4 text-sm font-semibold text-slate-900">No grades recorded yet</h3>
            <p class="mt-1 max-w-sm text-sm text-slate-500">
              Your results will appear here as soon as your teachers publish them.
            </p>
          </div>
        </section>

        <section class="card p-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold text-slate-900">Grade distribution</h3>
              <p class="text-xs text-slate-500">How your scores are spread</p>
            </div>
            <TrendingUp class="h-4 w-4 text-slate-400" />
          </div>

          <div class="mt-5 space-y-3">
            <div v-for="row in studentDistribution" :key="row.grade" class="flex items-center gap-3">
              <span class="w-4 text-sm font-semibold text-slate-700">{{ row.grade }}</span>
              <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  :class="['h-full rounded-full', distributionColour[row.grade]]"
                  :style="{ width: `${row.percent}%` }"
                />
              </div>
              <span class="w-16 text-right text-xs text-slate-500">
                {{ row.count }} · {{ row.percent }}%
              </span>
            </div>
          </div>
        </section>
      </div>

      <div class="card overflow-hidden">
        <div class="border-b border-slate-200 px-5 py-4">
          <h3 class="text-base font-semibold text-slate-900">All assessment scores</h3>
          <p class="text-xs text-slate-500">{{ studentRecords.length }} recorded results</p>
        </div>

        <div v-if="studentRecords.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" class="px-5 py-3 font-semibold">Subject</th>
                <th scope="col" class="px-5 py-3 font-semibold">Assessment</th>
                <th scope="col" class="hidden px-5 py-3 font-semibold md:table-cell">Class</th>
                <th scope="col" class="hidden px-5 py-3 font-semibold lg:table-cell">Term</th>
                <th scope="col" class="px-5 py-3 font-semibold">Score</th>
                <th scope="col" class="px-5 py-3 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="record in studentRecords" :key="record.id" class="hover:bg-slate-50">
                <td class="px-5 py-3 font-medium text-slate-800">{{ record.subject }}</td>
                <td class="px-5 py-3 text-slate-600">{{ record.assessment }}</td>
                <td class="hidden px-5 py-3 text-slate-600 md:table-cell">{{ record.className }}</td>
                <td class="hidden px-5 py-3 text-slate-600 lg:table-cell">{{ termLabel(record) }}</td>
                <td class="px-5 py-3 font-semibold text-slate-800">{{ record.score }}%</td>
                <td class="px-5 py-3">
                  <BaseBadge :tone="letterTone(gradesStore.letterFor(record.score))">
                    {{ gradesStore.letterFor(record.score) }}
                  </BaseBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Staff: record grades -->
    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900">Grades</h2>
          <p class="mt-1 text-sm text-slate-500">
            Record assessment scores by class, subject, and assessment.
          </p>
        </div>
        <BaseButton :disabled="roster.length === 0" @click="save">
          <Save class="h-4 w-4" />
          Save grades
        </BaseButton>
      </div>

      <div class="card p-4">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label for="grades-class" class="field-label">Class</label>
            <select id="grades-class" v-model="selectedClass" class="field-input">
              <option
                v-for="schoolClass in classesStore.classes"
                :key="schoolClass.id"
                :value="schoolClass.name"
              >
                {{ schoolClass.name }} · {{ schoolClass.grade }}
              </option>
            </select>
          </div>
          <div>
            <label for="grades-subject" class="field-label">Subject</label>
            <select id="grades-subject" v-model="selectedSubject" class="field-input">
              <option v-for="subject in subjects" :key="subject" :value="subject">
                {{ subject }}
              </option>
            </select>
          </div>
          <div>
            <label for="grades-assessment" class="field-label">Assessment</label>
            <select id="grades-assessment" v-model="selectedAssessment" class="field-input">
              <option v-for="assessment in assessments" :key="assessment" :value="assessment">
                {{ assessment }}
              </option>
            </select>
          </div>
          <div>
            <p class="field-label">Term</p>
            <div class="field-input flex items-center bg-slate-50 text-slate-600">
              {{ settingsStore.settings.term }} · {{ settingsStore.settings.academicYear }}
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Graded</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ numericScores.length }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Average</p>
          <p class="mt-1 text-2xl font-bold text-indigo-600">{{ average }}%</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Highest</p>
          <p class="mt-1 text-2xl font-bold text-emerald-600">{{ highest }}%</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-slate-500">Lowest</p>
          <p class="mt-1 text-2xl font-bold text-amber-600">{{ lowest }}%</p>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4"
        >
          <div>
            <h3 class="text-base font-semibold text-slate-900">Gradebook</h3>
            <p class="text-xs text-slate-500">
              {{ selectedSubject }} · {{ selectedAssessment }} · Class {{ selectedClass }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <BaseBadge tone="info">
              <Award class="mr-1 h-3 w-3" />
              {{ settingsStore.settings.term }}
            </BaseBadge>
            <BaseBadge :tone="average >= 70 ? 'active' : 'warning'">
              <TrendingUp class="mr-1 h-3 w-3" />
              {{ average }}% average
            </BaseBadge>
          </div>
        </div>

        <div v-if="roster.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" class="px-5 py-3 font-semibold">Student</th>
                <th scope="col" class="px-5 py-3 font-semibold">Class</th>
                <th scope="col" class="px-5 py-3 font-semibold">Score (%)</th>
                <th scope="col" class="px-5 py-3 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="student in roster" :key="student.id" class="hover:bg-slate-50">
                <td class="px-5 py-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
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
                <td class="px-5 py-3 text-slate-600">
                  {{ student.grade }} · {{ student.className }}
                </td>
                <td class="px-5 py-3">
                  <input
                    v-model.number="scores[student.id]"
                    type="number"
                    min="0"
                    max="100"
                    class="field-input w-28"
                    :aria-label="`Score for ${fullName(student.firstName, student.lastName)}`"
                    placeholder="—"
                  />
                </td>
                <td class="px-5 py-3">
                  <span
                    :class="[
                      'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                      letterFor(scoreFor(student.id)) === 'A'
                        ? 'bg-emerald-50 text-emerald-700'
                        : letterFor(scoreFor(student.id)) === 'B'
                          ? 'bg-sky-50 text-sky-700'
                          : letterFor(scoreFor(student.id)) === 'C'
                            ? 'bg-amber-50 text-amber-700'
                            : letterFor(scoreFor(student.id)) === 'D'
                              ? 'bg-orange-50 text-orange-700'
                              : letterFor(scoreFor(student.id)) === 'F'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-500',
                    ]"
                  >
                    {{ letterFor(scoreFor(student.id)) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
          >
            <UserRound class="h-6 w-6" />
          </div>
          <h3 class="mt-4 text-sm font-semibold text-slate-900">No active students in this class</h3>
          <p class="mt-1 max-w-sm text-sm text-slate-500">
            Add students to Class {{ selectedClass }} before recording grades.
          </p>
          <RouterLink
            to="/students"
            class="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <ClipboardList class="h-4 w-4" />
            Go to students
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>
