<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside 
      class="sidebar"
      :class="{ 'sidebar-hidden': !sidebarOpen }"
    >
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <Logo />
          <span class="brand-text">KinkyPolice</span>
        </div>
      </div>
      
      <nav>
        <ul>
          <li v-for="item in navigation" :key="item.name">
            <router-link :to="item.href">
              <span class="text-lg">{{ getIcon(item.name) }}</span>
              {{ item.name }}
            </router-link>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Mobile sidebar overlay -->
    <div 
      class="sidebar-overlay"
      :class="{ 'active': sidebarOpen }"
      @click="sidebarOpen = false"
    ></div>

    <!-- Main content -->
    <div class="main-content" :class="{ 'sidebar-closed': !sidebarOpen }">
      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="menu-toggle"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 class="page-title">{{ currentPageTitle }}</h1>
          
          <div class="header-actions">
            <!-- Theme toggle -->
            <button
              @click="themeStore.toggleTheme()"
              class="theme-toggle"
              :title="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <svg v-if="themeStore.isDark" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
              </svg>
              <svg v-else width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import Logo from '@/components/common/Logo.vue'

// Store
const themeStore = useThemeStore()

// Reactive data
const sidebarOpen = ref(false)
const route = useRoute()

// Navigation items
const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard'
  },
  {
    name: 'Configuration',
    href: '/config'
  },
  {
    name: 'Moderation',
    href: '/moderation'
  },
  {
    name: 'Analytics',
    href: '/analytics'
  },
  {
    name: 'Documentation',
    href: '/docs'
  }
]

// Icon mapping function
const getIcon = (name: string) => {
  const icons: Record<string, string> = {
    'Dashboard': '📊',
    'Configuration': '⚙️',
    'Moderation': '🛡️',
    'Analytics': '📈',
    'Documentation': '📚'
  }
  return icons[name] || '📄'
}

// Computed
const currentPageTitle = computed(() => {
  return route.meta.title as string || 'Dashboard'
})

// Initialize theme on mount
themeStore.initializeTheme()
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--gray-50);
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background: white;
  border-right: 1px solid var(--gray-200);
  box-shadow: var(--shadow-lg);
  transform: translateX(0);
  transition: transform var(--transition-normal);
  z-index: 40;
}

.sidebar-hidden {
  transform: translateX(-100%);
}

.sidebar-header {
  height: 80px;
  padding: var(--space-md);
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.brand-text {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--gray-800);
}

.sidebar nav {
  padding: var(--space-md);
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.sidebar a {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
  text-decoration: none;
  font-weight: 500;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.sidebar a:hover {
  background: var(--gray-100);
  color: var(--gray-800);
}

.sidebar a.router-link-active {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-md);
}

.main-content {
  margin-left: 280px;
  min-height: 100vh;
  transition: margin-left var(--transition-normal);
}

.main-content.sidebar-closed {
  margin-left: 0;
}

.header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--gray-200);
  height: 80px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--gray-800);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.theme-toggle {
  padding: var(--space-sm);
  border: none;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--gray-200);
  color: var(--gray-800);
}

.menu-toggle {
  display: none;
  padding: var(--space-sm);
  border: none;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
  cursor: pointer;
}

.page-content {
  padding: var(--space-lg);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 30;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-fast);
}

.sidebar-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Mobile styles */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .menu-toggle {
    display: block;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    max-width: 320px;
  }
  
  .header {
    padding: 0 var(--space-md);
  }
  
  .page-content {
    padding: var(--space-md);
  }
  
  .page-title {
    font-size: var(--font-size-xl);
  }
}
</style>