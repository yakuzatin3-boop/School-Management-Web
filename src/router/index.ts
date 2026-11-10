import { createRouter, createWebHistory } from 'vue-router'

import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import type { RoleKey } from '@/types'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Sign in' },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Dashboard' },
        },
        {
          path: 'students',
          name: 'students',
          component: () => import('@/views/StudentsView.vue'),
          meta: { title: 'Students', roles: ['admin', 'teacher'] satisfies RoleKey[] },
        },
        {
          path: 'teachers',
          name: 'teachers',
          component: () => import('@/views/TeachersView.vue'),
          meta: { title: 'Teachers', roles: ['admin'] satisfies RoleKey[] },
        },
        {
          path: 'classes',
          name: 'classes',
          component: () => import('@/views/ClassesView.vue'),
          meta: { title: 'Classes', roles: ['admin', 'teacher'] satisfies RoleKey[] },
        },
        {
          path: 'attendance',
          name: 'attendance',
          component: () => import('@/views/AttendanceView.vue'),
          meta: { title: 'Attendance' },
        },
        {
          path: 'grades',
          name: 'grades',
          component: () => import('@/views/GradesView.vue'),
          meta: { title: 'Grades' },
        },
        {
          path: 'timetable',
          name: 'timetable',
          component: () => import('@/views/TimetableView.vue'),
          meta: { title: 'Timetable' },
        },
        {
          path: 'fees',
          name: 'fees',
          component: () => import('@/views/FeesView.vue'),
          meta: { title: 'Fees' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: { title: 'Reports', roles: ['admin', 'teacher'] satisfies RoleKey[] },
        },
        {
          path: 'announcements',
          name: 'announcements',
          component: () => import('@/views/AnnouncementsView.vue'),
          meta: { title: 'Announcements' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: 'Settings' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Page not found' },
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  const roles = to.matched
    .flatMap((record) => (record.meta.roles as RoleKey[] | undefined) ?? [])
    .filter((role, index, list) => list.indexOf(role) === index)

  if (roles.length > 0 && auth.role && !roles.includes(auth.role)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
