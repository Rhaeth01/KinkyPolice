import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'KinkyPolice - Discord Bot Dashboard',
      description: 'Modern Discord bot with comprehensive server management features'
    }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: {
      title: 'Dashboard',
      description: 'Manage your Discord server settings and bot configuration',
      requiresAuth: true
    }
  },
  {
    path: '/dashboard/:serverId',
    name: 'server-dashboard',
    component: () => import('@/views/DashboardView.vue'),
    props: true,
    meta: {
      title: 'Server Dashboard',
      description: 'Configure bot settings for your Discord server',
      requiresAuth: true
    }
  },
  {
    path: '/config',
    name: 'config',
    component: () => import('@/views/ConfigView.vue'),
    meta: {
      title: 'Configuration',
      description: 'Bot configuration management',
      requiresAuth: true
    }
  },

  {
    path: '/docs',
    name: 'docs',
    component: () => import('@/views/DocsView.vue'),
    meta: {
      title: 'Documentation',
      description: 'Learn how to set up and use KinkyPolice bot features'
    }
  },
  {
    path: '/invite',
    name: 'invite',
    component: () => import('@/views/InviteView.vue'),
    meta: {
      title: 'Invite Bot',
      description: 'Add KinkyPolice bot to your Discord server'
    }
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallbackView.vue'),
    meta: {
      title: 'Authenticating'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // Update document title
  if (to.meta.title) {
    document.title = `${to.meta.title} - KinkyPolice`
  }

  // Update meta description
  if (to.meta.description) {
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', to.meta.description as string)
    }
  }

  // Check authentication for protected routes
  if (to.meta.requiresAuth) {
    // TODO: Implement authentication check
    // For now, allow all routes
    next()
  } else {
    next()
  }
})

export default router