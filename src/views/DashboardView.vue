<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import AdminDashboard from '@/components/dashboard/AdminDashboard.vue'
import TeacherDashboard from '@/components/dashboard/TeacherDashboard.vue'
import StudentDashboard from '@/components/dashboard/StudentDashboard.vue'

const auth = useAuthStore()
</script>

<template>
  <AdminDashboard v-if="auth.isAdmin" />
  <TeacherDashboard v-else-if="auth.isTeacher" />
  <StudentDashboard v-else-if="auth.isStudent" />
  <AdminDashboard v-else />
</template>
