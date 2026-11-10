<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Component } from 'vue'
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  School,
  Search,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-vue-next'

import GlobalSearch from '@/components/layout/GlobalSearch.vue'
import { formatShortDate } from '@/services/format'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useClassesStore } from '@/stores/classes'
import { useCoursesStore } from '@/stores/courses'
import { useFeesStore } from '@/stores/fees'
import { useGradesStore } from '@/stores/grades'
import { useSettingsStore } from '@/stores/settings'
import { useStudentsStore } from '@/stores/students'
import { useTeachersStore } from '@/stores/teachers'
import { useTimetableStore } from '@/stores/timetable'
import { useToastStore } from '@/stores/toast'
import type { RoleKey } from '@/types'

interface NavItem {
  name: string
  to: string
  icon: Component
  roles?: RoleKey[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const announcementsStore = useAnnouncementsStore()
const studentsStore = useStudentsStore()
const teachersStore = useTeachersStore()
const classesStore = useClassesStore()
const coursesStore = useCoursesStore()
const attendanceStore = useAttendanceStore()
const gradesStore = useGradesStore()
const feesStore = useFeesStore()
const timetableStore = useTimetableStore()
const toast = useToastStore()

const mobileOpen = ref(false)
const searchOpen = ref(false)
const notificationsOpen = ref(false)
const userMenu = ref<HTMLDetailsElement | null>(null)

const navigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', to: '/', icon: LayoutDashboard },
      { name: 'Reports', to: '/reports', icon: BarChart3, roles: ['admin', 'teacher'] },
    ],
  },
  {
    label: 'Academics',
    items: [
      { name: 'Students', to: '/students', icon: GraduationCap, roles: ['admin', 'teacher'] },
      { name: 'Teachers', to: '/teachers', icon: Users, roles: ['admin'] },
      { name: 'Classes', to: '/classes', icon: BookOpen, roles: ['admin', 'teacher'] },
      { name: 'Attendance', to: '/attendance', icon: CalendarCheck },
      { name: 'Grades', to: '/grades', icon: ClipboardList },
      { name: 'Timetable', to: '/timetable', icon: CalendarDays },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Fees', to: '/fees', icon: Wallet },
      { name: 'Announcements', to: '/announcements', icon: Megaphone },
      { name: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

const visibleNavigation = computed<NavGroup[]>(() =>
  navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (auth.role && item.roles.includes(auth.role))),
    }))
    .filter((group) => group.items.length > 0),
)

const roleTone = computed(() => {
  if (auth.isAdmin) return 'bg-indigo-500/20 text-indigo-200'
  if (auth.isTeacher) return 'bg-emerald-500/20 text-emerald-200'

  return 'bg-sky-500/20 text-sky-200'
})

const pageTitle = computed(() => (route.meta.title as string | undefined) ?? 'Dashboard')

const userInitials = computed(() => {
  const name = auth.user?.name ?? 'User'

  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const schoolName = computed(() => settingsStore.settings.name)

const pinnedAnnouncements = computed(() => announcementsStore.pinned.slice(0, 4))

const today = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date())

function isActive(path: string): boolean {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

async function logout(): Promise<void> {
  await auth.logout()
  toast.success('You have been signed out.')
  await router.push('/login')
}

function openSearch(): void {
  notificationsOpen.value = false
  userMenu.value?.removeAttribute('open')
  searchOpen.value = true
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)

  await Promise.allSettled([
    settingsStore.load(),
    announcementsStore.load(),
    coursesStore.load(),
    attendanceStore.load(),
    gradesStore.load(),
    feesStore.load(false, auth.isStudent ? 'mine' : 'all'),
    timetableStore.load(),
    auth.isStudent ? Promise.resolve() : classesStore.load(),
    auth.isStudent ? Promise.resolve() : studentsStore.load(),
    auth.isStudent ? Promise.resolve() : teachersStore.load(),
  ])
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

watch(
  () => route.path,
  () => {
    mobileOpen.value = false
    notificationsOpen.value = false
    userMenu.value?.removeAttribute('open')
  },
)
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
      @click="mobileOpen = false"
    />

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 text-slate-300 transition-transform duration-200 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <School class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-white">{{ schoolName }}</p>
          <p class="text-xs text-slate-400">School Management</p>
        </div>
        <button
          type="button"
          class="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
          @click="mobileOpen = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <div v-for="group in visibleNavigation" :key="group.label" class="space-y-1">
          <p class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {{ group.label }}
          </p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :class="[
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive(item.to)
                ? 'bg-indigo-500/15 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white',
            ]"
          >
            <component
              :is="item.icon"
              :class="[
                'h-5 w-5',
                isActive(item.to) ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300',
              ]"
            />
            {{ item.name }}
          </RouterLink>
        </div>
      </nav>

      <div class="shrink-0 border-t border-white/10 p-4">
        <div class="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-white">{{ auth.user?.name }}</p>
            <p
              :class="[
                'mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                roleTone,
              ]"
            >
              {{ auth.user?.role }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
            @click="logout"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <div class="lg:pl-72">
      <header
        class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6"
      >
        <button
          type="button"
          class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open navigation"
          @click="mobileOpen = true"
        >
          <Menu class="h-5 w-5" />
        </button>

        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold text-slate-900">{{ pageTitle }}</h1>
          <p class="hidden text-xs text-slate-500 sm:block">{{ today }}</p>
        </div>

        <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            class="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 md:flex"
            aria-label="Open search"
            @click="openSearch"
          >
            <Search class="h-4 w-4" />
            <span class="w-32 text-left lg:w-40">Search…</span>
            <kbd
              class="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
            >
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
            aria-label="Open search"
            @click="openSearch"
          >
            <Search class="h-5 w-5" />
          </button>

          <div class="relative">
            <button
              type="button"
              class="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
              @click="notificationsOpen = !notificationsOpen"
            >
              <Bell class="h-5 w-5" />
              <span
                v-if="pinnedAnnouncements.length > 0"
                class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
              />
            </button>

            <template v-if="notificationsOpen">
              <button
                type="button"
                class="fixed inset-0 z-10 cursor-default"
                aria-label="Close notifications"
                @click="notificationsOpen = false"
              />
              <div
                class="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              >
                <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p class="text-sm font-semibold text-slate-900">Notifications</p>
                  <span
                    class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                  >
                    {{ announcementsStore.items.length }} posts
                  </span>
                </div>

                <ul v-if="pinnedAnnouncements.length > 0" class="divide-y divide-slate-100">
                  <li v-for="announcement in pinnedAnnouncements" :key="announcement.id">
                    <RouterLink
                      to="/announcements"
                      class="block px-4 py-3 transition hover:bg-slate-50"
                    >
                      <p class="line-clamp-2 text-sm font-medium text-slate-800">
                        {{ announcement.title }}
                      </p>
                      <p class="mt-1 text-xs text-slate-500">
                        {{ formatShortDate(announcement.createdAt) }} · {{ announcement.audience }}
                      </p>
                    </RouterLink>
                  </li>
                </ul>

                <p v-else class="px-4 py-6 text-center text-sm text-slate-500">
                  No pinned announcements.
                </p>

                <RouterLink
                  to="/announcements"
                  class="block border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View all announcements
                </RouterLink>
              </div>
            </template>
          </div>

          <details ref="userMenu" class="group relative">
            <summary
              class="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
              >
                {{ userInitials }}
              </span>
              <ChevronDown
                class="hidden h-4 w-4 text-slate-400 transition group-open:rotate-180 sm:block"
              />
            </summary>

            <div
              class="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div class="border-b border-slate-200 px-4 py-3">
                <p class="truncate text-sm font-semibold text-slate-900">{{ auth.user?.name }}</p>
                <p class="truncate text-xs text-slate-500">{{ auth.user?.email }}</p>
                <p
                  class="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                >
                  {{ auth.user?.role }}
                </p>
              </div>
              <RouterLink
                to="/settings"
                class="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Settings class="h-4 w-4 text-slate-400" />
                Settings
              </RouterLink>
              <button
                type="button"
                class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                @click="logout"
              >
                <LogOut class="h-4 w-4" />
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <GlobalSearch :open="searchOpen" @close="searchOpen = false" />
  </div>
</template>
