import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { FeeInvoice } from '@/types'

export type InvoiceDraft = Omit<FeeInvoice, 'id' | 'status' | 'paidAt'> & {
  status?: FeeInvoice['status']
}

interface ApiInvoice {
  id: string
  studentId: string
  title: string
  amount: number
  dueDate: string
  status: FeeInvoice['status']
  paidAt: string | null
}

function mapInvoice(invoice: ApiInvoice): FeeInvoice {
  return {
    id: invoice.id,
    studentId: invoice.studentId,
    title: invoice.title,
    amount: Number(invoice.amount),
    dueDate: invoice.dueDate,
    status: invoice.status,
    paidAt: invoice.paidAt ?? undefined,
  }
}

export const useFeesStore = defineStore('fees', () => {
  const invoices = ref<FeeInvoice[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null
  let loadedScope: 'all' | 'mine' | null = null

  const today = new Date().toISOString().slice(0, 10)

  async function load(force = false, scope: 'all' | 'mine' = 'all'): Promise<void> {
    if (loadPromise && !force && loadedScope === scope) return loadPromise
    if (invoices.value.length && !force && loadedScope === scope) return

    loading.value = true
    loadPromise = apiRequest<ApiInvoice[]>(scope === 'mine' ? '/fees/me' : '/fees')
      .then((response) => {
        invoices.value = response.map(mapInvoice)
        loadedScope = scope
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  function effectiveStatus(invoice: FeeInvoice): FeeInvoice['status'] {
    if (invoice.status === 'paid') return 'paid'
    if (invoice.dueDate < today) return 'overdue'

    return 'pending'
  }

  const managedInvoices = computed(() =>
    invoices.value.map((invoice) => ({
      ...invoice,
      status: effectiveStatus(invoice),
    })),
  )

  const collected = computed(() =>
    managedInvoices.value
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
  )

  const outstanding = computed(() =>
    managedInvoices.value
      .filter((invoice) => invoice.status !== 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
  )

  const overdueCount = computed(
    () => managedInvoices.value.filter((invoice) => invoice.status === 'overdue').length,
  )

  const totalBilled = computed(() =>
    managedInvoices.value.reduce((sum, invoice) => sum + invoice.amount, 0),
  )

  const collectionRate = computed(() => {
    if (totalBilled.value === 0) return 0

    return Math.round((collected.value / totalBilled.value) * 100)
  })

  async function create(draft: InvoiceDraft): Promise<FeeInvoice> {
    const response = await apiRequest<ApiInvoice>('/fees', {
      method: 'POST',
      body: JSON.stringify({
        studentId: draft.studentId,
        title: draft.title,
        amount: draft.amount,
        dueDate: draft.dueDate,
        status: draft.status,
      }),
    })

    const invoice = mapInvoice(response)
    invoices.value = [invoice, ...invoices.value]

    return invoice
  }

  async function update(id: string, draft: InvoiceDraft): Promise<void> {
    const response = await apiRequest<ApiInvoice>(`/fees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        studentId: draft.studentId,
        title: draft.title,
        amount: draft.amount,
        dueDate: draft.dueDate,
        status: draft.status,
      }),
    })

    invoices.value = invoices.value.map((invoice) =>
      invoice.id === id ? mapInvoice(response) : invoice,
    )
  }

  async function markPaid(id: string): Promise<void> {
    const response = await apiRequest<ApiInvoice>(`/fees/${id}/pay`, {
      method: 'PATCH',
    })

    invoices.value = invoices.value.map((invoice) =>
      invoice.id === id ? mapInvoice(response) : invoice,
    )
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/fees/${id}`, { method: 'DELETE' })
    invoices.value = invoices.value.filter((invoice) => invoice.id !== id)
  }

  function find(id: string): FeeInvoice | undefined {
    return invoices.value.find((invoice) => invoice.id === id)
  }

  return {
    invoices,
    loading,
    managedInvoices,
    collected,
    outstanding,
    overdueCount,
    totalBilled,
    collectionRate,
    effectiveStatus,
    load,
    create,
    update,
    markPaid,
    remove,
    find,
  }
})
