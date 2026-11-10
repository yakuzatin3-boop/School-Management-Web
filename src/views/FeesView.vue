<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { downloadCsv } from '@/services/csv'
import { formatCurrency, formatDate, fullName, initials } from '@/services/format'
import { useAuthStore } from '@/stores/auth'
import { useFeesStore } from '@/stores/fees'
import { useStudentsStore } from '@/stores/students'
import { useToastStore } from '@/stores/toast'
import type { FeeInvoice, FeeStatus } from '@/types'

interface InvoiceFormState {
  studentId: string
  title: string
  amount: number
  dueDate: string
}

const auth = useAuthStore()
const feesStore = useFeesStore()
const studentsStore = useStudentsStore()
const toast = useToastStore()

const search = ref('')
const statusFilter = ref<'all' | FeeStatus>('all')

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)

  return date.toISOString().slice(0, 10)
}

function emptyForm(): InvoiceFormState {
  return {
    studentId: studentsStore.students[0]?.id ?? '',
    title: 'Term 1 Tuition',
    amount: 1200,
    dueDate: daysFromNow(14),
  }
}

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive<InvoiceFormState>(emptyForm())

const filteredInvoices = computed(() => {
  const term = search.value.trim().toLowerCase()

  return feesStore.managedInvoices.filter((invoice) => {
    const student = studentsStore.find(invoice.studentId)
    const searchable = [
      invoice.title,
      student ? fullName(student.firstName, student.lastName) : '',
      student?.className ?? '',
    ]
      .join(' ')
      .toLowerCase()

    const matchesTerm = !term || searchable.includes(term)
    const matchesStatus = statusFilter.value === 'all' || invoice.status === statusFilter.value

    return matchesTerm && matchesStatus
  })
})

function studentName(studentId: string): string {
  const student = studentsStore.find(studentId)

  return student ? fullName(student.firstName, student.lastName) : 'Unknown student'
}

function studentLabel(studentId: string): string {
  const student = studentsStore.find(studentId)

  return student ? `${student.grade} · Class ${student.className}` : 'Student record missing'
}

function studentInitials(studentId: string): string {
  const student = studentsStore.find(studentId)

  return student ? initials(student.firstName, student.lastName) : '?'
}

function toneFor(status: FeeStatus): 'active' | 'warning' | 'danger' {
  if (status === 'paid') return 'active'
  if (status === 'overdue') return 'danger'

  return 'warning'
}

function openCreate(): void {
  if (!auth.isAdmin) return

  Object.assign(form, emptyForm())
  editingId.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(invoice: FeeInvoice): void {
  if (!auth.isAdmin) return

  Object.assign(form, {
    studentId: invoice.studentId,
    title: invoice.title,
    amount: invoice.amount,
    dueDate: invoice.dueDate,
  })
  editingId.value = invoice.id
  formError.value = ''
  modalOpen.value = true
}

function validate(): boolean {
  formError.value = ''

  if (!form.studentId) {
    formError.value = 'Choose the student this invoice belongs to.'
    return false
  }

  if (!form.title.trim()) {
    formError.value = 'Enter an invoice title.'
    return false
  }

  if (!Number.isFinite(form.amount) || form.amount <= 0) {
    formError.value = 'Enter an amount greater than zero.'
    return false
  }

  if (!form.dueDate) {
    formError.value = 'Choose a due date.'
    return false
  }

  return true
}

function submit(): void {
  if (!validate()) return

  const payload = {
    studentId: form.studentId,
    title: form.title.trim(),
    amount: form.amount,
    dueDate: form.dueDate,
  }

  const action = editingId.value
    ? feesStore.update(editingId.value, payload)
    : feesStore.create(payload)

  action
    .then(() => {
      toast.success(editingId.value ? 'Invoice updated.' : 'Invoice created.')
      modalOpen.value = false
    })
    .catch((error: unknown) => {
      formError.value = error instanceof Error ? error.message : 'Unable to save this invoice.'
    })
}

const deleteTarget = ref<FeeInvoice | null>(null)

function confirmDelete(): void {
  if (!deleteTarget.value) return

  const target = deleteTarget.value

  feesStore
    .remove(target.id)
    .then(() => {
      toast.success('Invoice deleted.')
      deleteTarget.value = null
    })
    .catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete this invoice.')
    })
}

function markPaid(invoice: FeeInvoice): void {
  feesStore
    .markPaid(invoice.id)
    .then(() => {
      toast.success(`Payment recorded for ${studentName(invoice.studentId)}.`)
    })
    .catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to record this payment.')
    })
}

onMounted(async () => {
  if (auth.isStudent) {
    await feesStore.load(false, 'mine')
    return
  }

  await Promise.all([studentsStore.load(), feesStore.load()])
  Object.assign(form, emptyForm())
})

function exportCsv(): void {
  downloadCsv(
    'invoices.csv',
    ['Student', 'Invoice', 'Amount', 'Due date', 'Status', 'Paid date'],
    filteredInvoices.value.map((invoice) => [
      studentName(invoice.studentId),
      invoice.title,
      invoice.amount,
      invoice.dueDate,
      invoice.status,
      invoice.paidAt ?? '',
    ]),
  )
  toast.success('Invoice list exported.')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">
          {{ auth.isStudent ? 'My fees' : 'Fees' }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{
            auth.isStudent
              ? 'Review your invoices, payments, and outstanding balance.'
              : 'Track invoices, payments, and outstanding balances.'
          }}
        </p>
      </div>
      <div v-if="auth.isStaff" class="flex flex-wrap items-center gap-2">
        <BaseButton variant="secondary" @click="exportCsv">
          <Download class="h-4 w-4" />
          Export
        </BaseButton>
        <BaseButton v-if="auth.isAdmin" @click="openCreate">
          <Plus class="h-4 w-4" />
          New invoice
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-500">
            {{ auth.isStudent ? 'Paid to date' : 'Collected' }}
          </p>
          <span class="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <Banknote class="h-4 w-4" />
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-slate-900">
          {{ formatCurrency(feesStore.collected) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">{{ feesStore.collectionRate }}% of billed total</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-500">Outstanding</p>
          <span class="rounded-lg bg-amber-50 p-2 text-amber-600">
            <Wallet class="h-4 w-4" />
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-slate-900">
          {{ formatCurrency(feesStore.outstanding) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">Awaiting payment</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-500">Overdue</p>
          <span class="rounded-lg bg-rose-50 p-2 text-rose-600">
            <Receipt class="h-4 w-4" />
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ feesStore.overdueCount }}</p>
        <p class="mt-1 text-xs text-slate-500">Invoices past due</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-slate-500">
            {{ auth.isStudent ? 'Total billed' : 'Billed' }}
          </p>
          <span class="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <CreditCard class="h-4 w-4" />
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-slate-900">
          {{ formatCurrency(feesStore.totalBilled) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">{{ feesStore.managedInvoices.length }} invoices</p>
      </div>
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
            :placeholder="
              auth.isStudent ? 'Search your invoices…' : 'Search by student, invoice, or class…'
            "
            aria-label="Search invoices"
          />
        </div>
        <select v-model="statusFilter" class="field-input sm:w-44" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Showing {{ filteredInvoices.length }} of {{ feesStore.managedInvoices.length }} invoices
      </p>
    </div>

    <div class="card overflow-hidden">
      <!-- Student: personal invoices only -->
      <template v-if="auth.isStudent">
        <div v-if="filteredInvoices.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" class="px-5 py-3 font-semibold">Invoice</th>
                <th scope="col" class="px-5 py-3 font-semibold">Amount</th>
                <th scope="col" class="px-5 py-3 font-semibold">Due date</th>
                <th scope="col" class="px-5 py-3 font-semibold">Status</th>
                <th scope="col" class="hidden px-5 py-3 font-semibold sm:table-cell">Paid on</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-slate-50">
                <td class="px-5 py-3">
                  <p class="font-medium text-slate-800">{{ invoice.title }}</p>
                </td>
                <td class="px-5 py-3 font-semibold text-slate-800">
                  {{ formatCurrency(invoice.amount) }}
                </td>
                <td class="px-5 py-3 text-slate-600">{{ formatDate(invoice.dueDate) }}</td>
                <td class="px-5 py-3">
                  <BaseBadge :tone="toneFor(invoice.status)">{{ invoice.status }}</BaseBadge>
                </td>
                <td class="hidden px-5 py-3 text-slate-600 sm:table-cell">
                  {{ invoice.paidAt ? formatDate(invoice.paidAt) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Wallet class="h-6 w-6" />
          </div>
          <h3 class="mt-4 text-sm font-semibold text-slate-900">No invoices found</h3>
          <p class="mt-1 max-w-sm text-sm text-slate-500">
            {{
              feesStore.managedInvoices.length === 0
                ? 'You have no invoices on file yet.'
                : 'Try changing your search or status filter.'
            }}
          </p>
        </div>
      </template>

      <!-- Staff: invoice management (writes are admin-only) -->
      <template v-else>
        <div v-if="filteredInvoices.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" class="px-5 py-3 font-semibold">Student</th>
                <th scope="col" class="px-5 py-3 font-semibold">Invoice</th>
                <th scope="col" class="px-5 py-3 font-semibold">Amount</th>
                <th scope="col" class="hidden px-5 py-3 font-semibold md:table-cell">Due date</th>
                <th scope="col" class="px-5 py-3 font-semibold">Status</th>
                <th v-if="auth.isAdmin" scope="col" class="px-5 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-slate-50">
                <td class="px-5 py-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                    >
                      {{ studentInitials(invoice.studentId) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-800">
                        {{ studentName(invoice.studentId) }}
                      </p>
                      <p class="truncate text-xs text-slate-500">
                        {{ studentLabel(invoice.studentId) }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3">
                  <p class="font-medium text-slate-700">{{ invoice.title }}</p>
                  <p v-if="invoice.paidAt" class="text-xs text-slate-500">
                    Paid {{ formatDate(invoice.paidAt) }}
                  </p>
                </td>
                <td class="px-5 py-3 font-semibold text-slate-800">
                  {{ formatCurrency(invoice.amount) }}
                </td>
                <td class="hidden px-5 py-3 text-slate-600 md:table-cell">
                  {{ formatDate(invoice.dueDate) }}
                </td>
                <td class="px-5 py-3">
                  <BaseBadge :tone="toneFor(invoice.status)">{{ invoice.status }}</BaseBadge>
                </td>
                <td v-if="auth.isAdmin" class="px-5 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      v-if="invoice.status !== 'paid'"
                      type="button"
                      class="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                      :aria-label="`Mark invoice paid for ${studentName(invoice.studentId)}`"
                      title="Mark paid"
                      @click="markPaid(invoice)"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                      :aria-label="`Edit invoice for ${studentName(invoice.studentId)}`"
                      @click="openEdit(invoice)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      :aria-label="`Delete invoice for ${studentName(invoice.studentId)}`"
                      @click="deleteTarget = invoice"
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
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Wallet class="h-6 w-6" />
          </div>
          <h3 class="mt-4 text-sm font-semibold text-slate-900">No invoices found</h3>
          <p class="mt-1 max-w-sm text-sm text-slate-500">
            {{
              auth.isAdmin
                ? 'Try changing your search or filter, or create a new invoice.'
                : 'Try changing your search or status filter.'
            }}
          </p>
          <BaseButton v-if="auth.isAdmin" class="mt-5" @click="openCreate">
            <Plus class="h-4 w-4" />
            New invoice
          </BaseButton>
        </div>
      </template>
    </div>

    <BaseModal
      v-if="auth.isAdmin"
      :open="modalOpen"
      :title="editingId ? 'Edit invoice' : 'New invoice'"
      description="Invoices are linked to a student and tracked until payment."
      @close="modalOpen = false"
    >
      <form id="invoice-form" class="space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label for="invoice-student" class="field-label">Student</label>
          <select id="invoice-student" v-model="form.studentId" class="field-input">
            <option v-for="student in studentsStore.students" :key="student.id" :value="student.id">
              {{ student.firstName }} {{ student.lastName }} · {{ student.className }}
            </option>
          </select>
        </div>

        <div>
          <label for="invoice-title" class="field-label">Invoice title</label>
          <input
            id="invoice-title"
            v-model="form.title"
            type="text"
            class="field-input"
            placeholder="Term 1 Tuition"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="invoice-amount" class="field-label">Amount (USD)</label>
            <input
              id="invoice-amount"
              v-model.number="form.amount"
              type="number"
              min="1"
              step="1"
              class="field-input"
            />
          </div>
          <div>
            <label for="invoice-due" class="field-label">Due date</label>
            <input id="invoice-due" v-model="form.dueDate" type="date" class="field-input" />
          </div>
        </div>

        <p v-if="formError" class="field-error">{{ formError }}</p>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" form="invoice-form">
            {{ editingId ? 'Save changes' : 'Create invoice' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <ConfirmDialog
      v-if="auth.isAdmin"
      :open="deleteTarget !== null"
      title="Delete invoice"
      :message="
        deleteTarget
          ? `This will permanently delete the invoice “${deleteTarget.title}” for ${studentName(deleteTarget.studentId)}.`
          : ''
      "
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
