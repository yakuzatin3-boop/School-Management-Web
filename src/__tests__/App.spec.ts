import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'

import App from '../App.vue'
import LoginView from '../views/LoginView.vue'

describe('App', () => {
  it('renders the login screen for unauthenticated visitors', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Dashboard</div>' } },
        { path: '/login', component: LoginView },
      ],
    })

    await router.push('/login')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.text()).toContain('Welcome back')
    expect(wrapper.text()).toContain('Email address')
    expect(wrapper.text()).toContain('Sign in')
  })
})
