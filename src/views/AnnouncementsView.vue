<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  GraduationCap,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-vue-next'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { formatDate } from '@/services/format'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Announcement, Audience } from '@/types'

interface AnnouncementFormState {
  title: string
  body: string
  audience: Audience
  pinned: boolean
}

const announcementsStore = useAnnouncementsStore()
const auth = useAuthStore()
const toast = useToastStore()

const canManage = computed(() => auth.isStaff)

const audienceFilter = ref<'all' | Audience>('all')

const audiences: Array<{ value: Audience; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
]

const filters: Array<{ value: 'all' | Audience; label: string }> = [
  { value: 'all', label: 'All posts' },
  ...audiences,
]

const audienceIcons = {
  all: Users,
  students: GraduationCap,
  teachers: UserRound,
  parents: Users,
}

const visibleAnnouncements = computed(() =>
  audienceFilter.value === 'all'
    ? announcementsStore.sorted
    : announcementsStore.sorted.filter(
        (announcement) => announcement.audience === audienceFilter.value,
      ),
)

function emptyForm(): AnnouncementFormState {
  return {
    title: '',
    body: '',
    audience: 'all',
    pinned: false,
  }
}

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive<AnnouncementFormState>(emptyForm())

function audienceLabel(audience: Audience): string {
  return audiences.find((item) => item.value === audience)?.label ?? 'Everyone'
}

function openCreate(): void {
  if (!canManage.value) return

  Object.assign(form, emptyForm())
  editingId.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(announcement: Announcement): void {
  if (!canManage.value) return

  Object.assign(form, {
    title: announcement.title,
    body: announcement.body,
    audience: announcement.audience,
    pinned: announcement.pinned,
  })
  editingId.value = announcement.id
  formError.value = ''
  modalOpen.value = true
}

function validate(): boolean {
  formError.value = ''

  if (!form.title.trim()) {
    formError.value = 'Add a title for this announcement.'
    return false
  }

  if (!form.body.trim()) {
    formError.value = 'Write the announcement message.'
    return false
  }

  return true
}

async function submit(): Promise<void> {
  if (!validate() || !canManage.value) return

  const payload = {
    title: form.title.trim(),
    body: form.body.trim(),
    audience: form.audience,
    pinned: form.pinned,
  }

  try {
    if (editingId.value) {
      await announcementsStore.update(editingId.value, payload)
      toast.success('Announcement updated.')
    } else {
      await announcementsStore.create({ ...payload, author: auth.user?.name })
      toast.success('Announcement published.')
    }

    modalOpen.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Unable to save this announcement.'
  }
}

const deleteTarget = ref<Announcement | null>(null)

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return

  const target = deleteTarget.value

  try {
    await announcementsStore.remove(target.id)
    toast.success('Announcement deleted.')
    deleteTarget.value = null
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Unable to delete this announcement.')
  }
}

async function togglePin(announcement: Announcement): Promise<void> {
  if (!canManage.value) return

  try {
    await announcementsStore.togglePin(announcement.id)
    toast.success(announcement.pinned ? 'Announcement unpinned.' : 'Announcement pinned.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Unable to update this announcement.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Announcements</h2>
        <p class="mt-1 text-sm text-slate-500">
          Share news and notices with students, teachers, and parents.
        </p>
      </div>
      <BaseButton v-if="canManage" @click="openCreate">
        <Plus class="h-4 w-4" />
        New announcement
      </BaseButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        :class="[
          'rounded-full border px-3 py-1.5 text-xs font-medium transition',
          audienceFilter === filter.value
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700',
        ]"
        @click="audienceFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </div>

    <div v-if="visibleAnnouncements.length > 0" class="grid gap-4 lg:grid-cols-2">
      <article
        v-for="announcement in visibleAnnouncements"
        :key="announcement.id"
        :class="[
          'card flex flex-col p-5 transition hover:shadow-md',
          announcement.pinned ? 'ring-1 ring-indigo-200' : '',
        ]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <BaseBadge :tone="announcement.pinned ? 'info' : 'neutral'">
              <component :is="audienceIcons[announcement.audience]" class="mr-1 h-3 w-3" />
              {{ audienceLabel(announcement.audience) }}
            </BaseBadge>
            <BaseBadge v-if="announcement.pinned" tone="warning">
              <Pin class="mr-1 h-3 w-3" />
              Pinned
            </BaseBadge>
          </div>

          <div v-if="canManage" class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
              :aria-label="announcement.pinned ? 'Unpin announcement' : 'Pin announcement'"
              @click="togglePin(announcement)"
            >
              <PinOff v-if="announcement.pinned" class="h-4 w-4" />
              <Pin v-else class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
              :aria-label="`Edit ${announcement.title}`"
              @click="openEdit(announcement)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              :aria-label="`Delete ${announcement.title}`"
              @click="deleteTarget = announcement"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <h3 class="mt-3 text-base font-semibold text-slate-900">{{ announcement.title }}</h3>
        <p class="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {{ announcement.body }}
        </p>

        <div class="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-slate-500">
          <span>{{ announcement.author }}</span>
          <span>{{ formatDate(announcement.createdAt) }}</span>
        </div>
      </article>
    </div>

    <div v-else class="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <Megaphone class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-900">No announcements in this audience</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">
        {{
          canManage
            ? 'Publish a new announcement or switch to another audience filter.'
            : 'Switch to another audience filter to see more announcements.'
        }}
      </p>
      <BaseButton v-if="canManage" class="mt-5" @click="openCreate">
        <Plus class="h-4 w-4" />
        New announcement
      </BaseButton>
    </div>

    <BaseModal
      v-if="canManage"
      :open="modalOpen"
      :title="editingId ? 'Edit announcement' : 'New announcement'"
      description="Published announcements appear in the notification panel."
      wide
      @close="modalOpen = false"
    >
      <form id="announcement-form" class="space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label for="announcement-title" class="field-label">Title</label>
          <input
            id="announcement-title"
            v-model="form.title"
            type="text"
            class="field-input"
            placeholder="Parent–teacher conferences open next week"
          />
        </div>

        <div>
          <label for="announcement-body" class="field-label">Message</label>
          <textarea
            id="announcement-body"
            v-model="form.body"
            rows="5"
            class="field-input resize-y"
            placeholder="Write the full announcement here…"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="announcement-audience" class="field-label">Audience</label>
            <select id="announcement-audience" v-model="form.audience" class="field-input">
              <option v-for="audience in audiences" :key="audience.value" :value="audience.value">
                {{ audience.label }}
              </option>
            </select>
          </div>
          <div class="flex items-end">
            <label
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              <input
                v-model="form.pinned"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Pin to top of notifications
            </label>
          </div>
        </div>

        <p v-if="formError" class="field-error">{{ formError }}</p>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" form="announcement-form">
            {{ editingId ? 'Save changes' : 'Publish announcement' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <ConfirmDialog
      v-if="canManage"
      :open="deleteTarget !== null"
      title="Delete announcement"
      :message="deleteTarget ? `This will permanently delete “${deleteTarget.title}”.` : ''"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
