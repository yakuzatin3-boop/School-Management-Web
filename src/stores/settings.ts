import { ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { SchoolSettings } from '@/types'

const defaultSettings: SchoolSettings = {
  name: 'Northwood Academy',
  email: 'office@northwood.edu',
  phone: '+1 (555) 010-1000',
  address: '1200 Maple Avenue, Northwood, CA 90210',
  academicYear: '2025–2026',
  term: 'Term 1',
  principal: 'Dr. Evelyn Hart',
}

interface ApiSettings extends SchoolSettings {
  id: string
  updatedAt: string
}

function mapSettings(settings: ApiSettings): SchoolSettings {
  return {
    name: settings.name,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    academicYear: settings.academicYear,
    term: settings.term,
    principal: settings.principal,
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SchoolSettings>({ ...defaultSettings })
  const loading = ref(false)
  let loadPromise: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise
    if (loadPromise) return

    loading.value = true
    loadPromise = apiRequest<ApiSettings>('/settings')
      .then((response) => {
        settings.value = mapSettings(response)
      })
      .finally(() => {
        loading.value = false
        loadPromise = null
      })

    return loadPromise
  }

  async function update(next: SchoolSettings): Promise<void> {
    const response = await apiRequest<ApiSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(next),
    })

    settings.value = mapSettings(response)
  }

  return { settings, loading, load, update }
})
