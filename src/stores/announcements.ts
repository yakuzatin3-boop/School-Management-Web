import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { Announcement } from '@/types'

export type AnnouncementDraft = Omit<Announcement, 'id' | 'createdAt' | 'author'> & {
  author?: string
}

interface ApiAnnouncement {
  id: string
  title: string
  content: string
  audience: Announcement['audience']
  isPublished: boolean
  createdAt: string
  author: { email: string } | null
}

interface AnnouncementPage {
  data: ApiAnnouncement[]
}

function mapAnnouncement(item: ApiAnnouncement): Announcement {
  return {
    id: item.id,
    title: item.title,
    body: item.content,
    audience: item.audience,
    pinned: item.isPublished,
    createdAt: item.createdAt,
    author: item.author?.email ?? 'School office',
  }
}

export const useAnnouncementsStore = defineStore('announcements', () => {
  const items = ref<Announcement[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  const sorted = computed(() =>
    [...items.value].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
    ),
  )

  const pinned = computed(() => sorted.value.filter((announcement) => announcement.pinned))

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (items.value.length && !force) return

    loading.value = true
    loadPromise = apiRequest<AnnouncementPage>('/announcements?limit=100&includeExpired=true')
      .then((response) => {
        items.value = response.data.map(mapAnnouncement)
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })
    return loadPromise
  }

  async function create(draft: AnnouncementDraft): Promise<Announcement> {
    const response = await apiRequest<ApiAnnouncement>('/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: draft.title,
        content: draft.body,
        audience: draft.audience,
        isPublished: draft.pinned,
      }),
    })
    const announcement = mapAnnouncement(response)
    items.value = [announcement, ...items.value]
    return announcement
  }

  async function update(id: string, draft: AnnouncementDraft): Promise<void> {
    const response = await apiRequest<ApiAnnouncement>(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: draft.title, content: draft.body, audience: draft.audience }),
    })
    items.value = items.value.map((item) => (item.id === id ? mapAnnouncement(response) : item))
    const current = items.value.find((item) => item.id === id)
    if (current && current.pinned !== draft.pinned) await togglePin(id)
  }

  async function remove(id: string): Promise<void> {
    await apiRequest(`/announcements/${id}`, { method: 'DELETE' })
    items.value = items.value.filter((announcement) => announcement.id !== id)
  }

  async function togglePin(id: string): Promise<void> {
    const announcement = items.value.find((item) => item.id === id)
    if (!announcement) return

    const path = announcement.pinned ? `/announcements/${id}/unpublish` : `/announcements/${id}/publish`
    const response = await apiRequest<ApiAnnouncement>(path, {
      method: 'PATCH',
      body: JSON.stringify({ notifyUsers: true }),
    })
    items.value = items.value.map((item) => (item.id === id ? mapAnnouncement(response) : item))
  }

  return { items, loading, sorted, pinned, load, create, update, remove, togglePin }
})
