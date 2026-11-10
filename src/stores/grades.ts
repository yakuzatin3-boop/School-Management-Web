import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import { useClassesStore } from '@/stores/classes'
import type { GradeRecord } from '@/types'

export interface GradeEntry {
  studentId: string
  score: number
}

interface ApiGrade {
  id: string
  studentId: string
  classId: string
  className: string
  subject: string
  assessment: string
  score: number
  term: string
  updatedAt: string
}

function mapRecord(record: ApiGrade): GradeRecord {
  return {
    id: record.id,
    studentId: record.studentId,
    classId: record.classId,
    className: record.className,
    subject: record.subject,
    assessment: record.assessment,
    score: Number(record.score),
    term: record.term,
    updatedAt: record.updatedAt,
  }
}

export const useGradesStore = defineStore('grades', () => {
  const records = ref<GradeRecord[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (records.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<ApiGrade[]>('/gradebook')
      .then((response) => {
        records.value = response.map(mapRecord)
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  function forAssessment(className: string, subject: string, assessment: string): GradeRecord[] {
    return records.value.filter(
      (record) =>
        record.className === className &&
        record.subject === subject &&
        record.assessment === assessment,
    )
  }

  function scoreFor(
    studentId: string,
    className: string,
    subject: string,
    assessment: string,
  ): number | undefined {
    return records.value.find(
      (record) =>
        record.studentId === studentId &&
        record.className === className &&
        record.subject === subject &&
        record.assessment === assessment,
    )?.score
  }

  async function saveAssessment(
    className: string,
    subject: string,
    assessment: string,
    term: string,
    entries: GradeEntry[],
  ): Promise<void> {
    const classesStore = useClassesStore()
    await classesStore.load()

    const schoolClass = classesStore.classes.find((item) => item.name === className)

    if (!schoolClass) {
      throw new Error(`Class ${className} was not found`)
    }

    const saved = await apiRequest<ApiGrade[]>('/gradebook/bulk', {
      method: 'POST',
      body: JSON.stringify({
        classId: schoolClass.id,
        subject,
        assessment,
        term,
        entries,
      }),
    })

    const savedRecords = saved.map(mapRecord)
    records.value = [
      ...records.value.filter(
        (record) =>
          !(
            record.className === className &&
            record.subject === subject &&
            record.assessment === assessment
          ),
      ),
      ...savedRecords,
    ]
  }

  function averageFor(className: string, subject: string, assessment: string): number {
    const scores = forAssessment(className, subject, assessment)
    if (scores.length === 0) return 0

    return Math.round(scores.reduce((sum, record) => sum + record.score, 0) / scores.length)
  }

  const overallAverage = computed(() => {
    if (records.value.length === 0) return 0

    return Math.round(
      records.value.reduce((sum, record) => sum + record.score, 0) / records.value.length,
    )
  })

  const gradeDistribution = computed(() => {
    const buckets = { A: 0, B: 0, C: 0, D: 0, F: 0 }

    records.value.forEach((record) => {
      if (record.score >= 90) buckets.A += 1
      else if (record.score >= 80) buckets.B += 1
      else if (record.score >= 70) buckets.C += 1
      else if (record.score >= 60) buckets.D += 1
      else buckets.F += 1
    })

    return buckets
  })

  function letterFor(score: number): string {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'

    return 'F'
  }

  return {
    records,
    loading,
    overallAverage,
    gradeDistribution,
    load,
    forAssessment,
    scoreFor,
    saveAssessment,
    averageFor,
    letterFor,
  }
})
