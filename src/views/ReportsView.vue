<script setup lang="ts">
import { computed } from 'vue'
import { Download, GraduationCap, TrendingUp, Users, Wallet } from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { downloadCsv } from '@/services/csv'
import { formatCurrency, percentage } from '@/services/format'
import { useAttendanceStore } from '@/stores/attendance'
import { useClassesStore } from '@/stores/classes'
import { useFeesStore } from '@/stores/fees'
import { useGradesStore } from '@/stores/grades'
import { useStudentsStore } from '@/stores/students'
import { useTeachersStore } from '@/stores/teachers'
import { useToastStore } from '@/stores/toast'

const studentsStore = useStudentsStore()
const teachersStore = useTeachersStore()
const classesStore = useClassesStore()
const gradesStore = useGradesStore()
const attendanceStore = useAttendanceStore()
const feesStore = useFeesStore()
const toast = useToastStore()

const grades = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const enrollmentByGrade = computed(() =>
  grades.map((grade) => ({
    grade,
    count: studentsStore.students.filter(
      (student) => student.grade === grade && student.status === 'active',
    ).length,
  })),
)

const maxEnrollment = computed(() =>
  Math.max(1, ...enrollmentByGrade.value.map((entry) => entry.count)),
)

const genderCounts = computed(() => {
  const counts = { male: 0, female: 0, other: 0 }

  studentsStore.students.forEach((student) => {
    counts[student.gender] += 1
  })

  return counts
})

const genderRows = computed(() => [
  { label: 'Female', count: genderCounts.value.female, color: 'bg-indigo-500' },
  { label: 'Male', count: genderCounts.value.male, color: 'bg-sky-500' },
  { label: 'Other', count: genderCounts.value.other, color: 'bg-amber-500' },
])

const gradeRows = computed(() => {
  const distribution = gradesStore.gradeDistribution
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)

  return [
    { grade: 'A', count: distribution.A, color: 'bg-emerald-500' },
    { grade: 'B', count: distribution.B, color: 'bg-sky-500' },
    { grade: 'C', count: distribution.C, color: 'bg-amber-500' },
    { grade: 'D', count: distribution.D, color: 'bg-orange-500' },
    { grade: 'F', count: distribution.F, color: 'bg-rose-500' },
  ].map((row) => ({ ...row, percent: percentage(row.count, total) }))
})

const classStats = computed(() =>
  classesStore.classes.map((schoolClass) => {
    const records = gradesStore.records.filter((record) => record.className === schoolClass.name)
    const average =
      records.length > 0
        ? Math.round(records.reduce((sum, record) => sum + record.score, 0) / records.length)
        : 0
    const enrolled = studentsStore.countByClass(schoolClass.name)

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      grade: schoolClass.grade,
      teacher: teachersStore.name(schoolClass.teacherId),
      enrolled,
      capacity: schoolClass.capacity,
      average,
      attendance: attendanceStore.rateForClass(schoolClass.name),
    }
  }),
)

const feeCounts = computed(() => {
  const counts = { paid: 0, pending: 0, overdue: 0 }

  feesStore.managedInvoices.forEach((invoice) => {
    counts[invoice.status] += 1
  })

  return counts
})

const feeTotal = computed(
  () => feeCounts.value.paid + feeCounts.value.pending + feeCounts.value.overdue,
)

const feeRows = computed(() => [
  {
    label: 'Paid',
    count: feeCounts.value.paid,
    amount: feesStore.collected,
    color: 'bg-emerald-500',
  },
  {
    label: 'Pending',
    count: feeCounts.value.pending,
    amount: feesStore.managedInvoices
      .filter((invoice) => invoice.status === 'pending')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
    color: 'bg-amber-500',
  },
  {
    label: 'Overdue',
    count: feeCounts.value.overdue,
    amount: feesStore.managedInvoices
      .filter((invoice) => invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
    color: 'bg-rose-500',
  },
])

function exportReport(): void {
  downloadCsv(
    'school-report.csv',
    ['Class', 'Grade', 'Teacher', 'Enrolled', 'Capacity', 'Average grade', 'Attendance'],
    classStats.value.map((row) => [
      row.name,
      row.grade,
      row.teacher,
      row.enrolled,
      row.capacity,
      `${row.average}%`,
      `${row.attendance}%`,
    ]),
  )
  toast.success('Report exported.')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Reports</h2>
        <p class="mt-1 text-sm text-slate-500">
          School-wide performance, attendance, and finance insights.
        </p>
      </div>
      <BaseButton variant="secondary" @click="exportReport">
        <Download class="h-4 w-4" />
        Export report
      </BaseButton>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active students"
        :value="studentsStore.activeCount"
        hint="Currently enrolled"
        :icon="GraduationCap"
        tone="indigo"
      />
      <StatCard
        label="Average grade"
        :value="`${gradesStore.overallAverage}%`"
        hint="Across all assessments"
        :icon="TrendingUp"
        tone="emerald"
      />
      <StatCard
        label="Attendance rate"
        :value="`${attendanceStore.overallRate}%`"
        hint="Present or late"
        :icon="Users"
        tone="amber"
      />
      <StatCard
        label="Fee collection"
        :value="`${feesStore.collectionRate}%`"
        :hint="`${formatCurrency(feesStore.collected)} collected`"
        :icon="Wallet"
        tone="sky"
      />
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Enrollment by grade</h3>
            <p class="text-xs text-slate-500">Active students per grade level</p>
          </div>
          <BaseBadge tone="info">{{ studentsStore.activeCount }} active</BaseBadge>
        </div>
        <div class="mt-5 space-y-4">
          <div v-for="entry in enrollmentByGrade" :key="entry.grade">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">{{ entry.grade }}</span>
              <span class="text-slate-500">{{ entry.count }}</span>
            </div>
            <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
                :style="{ width: `${(entry.count / maxEnrollment) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Student demographics</h3>
            <p class="text-xs text-slate-500">Gender split across all students</p>
          </div>
          <BaseBadge tone="neutral">{{ studentsStore.total }} students</BaseBadge>
        </div>
        <div class="mt-5 space-y-3">
          <div v-for="row in genderRows" :key="row.label" class="flex items-center gap-3">
            <span class="w-16 text-sm font-medium text-slate-700">{{ row.label }}</span>
            <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                :class="['h-full rounded-full', row.color]"
                :style="{ width: `${percentage(row.count, studentsStore.total)}%` }"
              />
            </div>
            <span class="w-16 text-right text-xs text-slate-500">
              {{ row.count }} · {{ percentage(row.count, studentsStore.total) }}%
            </span>
          </div>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Grade distribution</h3>
            <p class="text-xs text-slate-500">All recorded assessment scores</p>
          </div>
          <BaseBadge tone="neutral">{{ gradesStore.records.length }} scores</BaseBadge>
        </div>
        <div class="mt-5 space-y-3">
          <div v-for="row in gradeRows" :key="row.grade" class="flex items-center gap-3">
            <span class="w-4 text-sm font-semibold text-slate-700">{{ row.grade }}</span>
            <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                :class="['h-full rounded-full', row.color]"
                :style="{ width: `${row.percent}%` }"
              />
            </div>
            <span class="w-16 text-right text-xs text-slate-500"
              >{{ row.count }} · {{ row.percent }}%</span
            >
          </div>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Attendance by class</h3>
            <p class="text-xs text-slate-500">Present or late across saved registers</p>
          </div>
          <BaseBadge :tone="attendanceStore.overallRate >= 90 ? 'active' : 'warning'">
            {{ attendanceStore.overallRate }}% overall
          </BaseBadge>
        </div>
        <div class="mt-5 space-y-3">
          <div v-for="row in classStats" :key="row.id">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">Class {{ row.name }}</span>
              <span class="text-slate-500">{{ row.attendance }}%</span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                :class="[
                  'h-full rounded-full',
                  row.attendance >= 90 ? 'bg-emerald-500' : 'bg-amber-500',
                ]"
                :style="{ width: `${row.attendance}%` }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Fee status</h3>
            <p class="text-xs text-slate-500">Invoice count and value by status</p>
          </div>
          <BaseBadge tone="info">{{ formatCurrency(feesStore.totalBilled) }} billed</BaseBadge>
        </div>

        <div class="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            v-for="row in feeRows"
            :key="row.label"
            :class="['h-full', row.color]"
            :style="{ width: `${percentage(row.count, feeTotal)}%` }"
          />
        </div>

        <ul class="mt-5 space-y-3">
          <li
            v-for="row in feeRows"
            :key="row.label"
            class="flex items-center justify-between text-sm"
          >
            <span class="flex items-center gap-2 text-slate-600">
              <span :class="['h-2.5 w-2.5 rounded-full', row.color]" />
              {{ row.label }}
              <span class="text-xs text-slate-400">({{ row.count }})</span>
            </span>
            <span class="font-medium text-slate-700">{{ formatCurrency(row.amount) }}</span>
          </li>
        </ul>
      </section>
    </div>

    <section class="card overflow-hidden">
      <div class="border-b border-slate-200 px-5 py-4">
        <h3 class="text-base font-semibold text-slate-900">Class performance</h3>
        <p class="text-xs text-slate-500">Attendance, grades, and capacity at a glance</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" class="px-5 py-3 font-semibold">Class</th>
              <th scope="col" class="px-5 py-3 font-semibold">Teacher</th>
              <th scope="col" class="px-5 py-3 font-semibold">Students</th>
              <th scope="col" class="px-5 py-3 font-semibold">Capacity</th>
              <th scope="col" class="px-5 py-3 font-semibold">Average</th>
              <th scope="col" class="px-5 py-3 font-semibold">Attendance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="row in classStats" :key="row.id" class="hover:bg-slate-50">
              <td class="px-5 py-3">
                <p class="font-medium text-slate-800">{{ row.name }}</p>
                <p class="text-xs text-slate-500">{{ row.grade }}</p>
              </td>
              <td class="px-5 py-3 text-slate-600">{{ row.teacher }}</td>
              <td class="px-5 py-3 text-slate-600">{{ row.enrolled }}</td>
              <td class="px-5 py-3 text-slate-600">{{ row.enrolled }} / {{ row.capacity }}</td>
              <td class="px-5 py-3">
                <BaseBadge :tone="row.average >= 70 ? 'active' : 'warning'"
                  >{{ row.average }}%</BaseBadge
                >
              </td>
              <td class="px-5 py-3">
                <BaseBadge :tone="row.attendance >= 90 ? 'active' : 'warning'">
                  {{ row.attendance }}%
                </BaseBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
