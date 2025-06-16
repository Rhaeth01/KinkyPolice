<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CogIcon, ShieldCheckIcon, ChartBarIcon, UsersIcon } from '@heroicons/vue/24/outline'

const isLoading = ref(true)
const servers = ref([
  {
    id: '1',
    name: 'KinkyPolice Official',
    icon: null,
    memberCount: 1250,
    status: 'online'
  },
  {
    id: '2', 
    name: 'Test Server',
    icon: null,
    memberCount: 45,
    status: 'online'
  }
])

const stats = ref([
  {
    label: 'Total Servers',
    value: '2',
    icon: UsersIcon,
    color: 'text-blue-400'
  },
  {
    label: 'Commands Used',
    value: '1,234',
    icon: CogIcon,
    color: 'text-green-400'
  },
  {
    label: 'Moderation Actions',
    value: '89',
    icon: ShieldCheckIcon,
    color: 'text-red-400'
  },
  {
    label: 'Active Users',
    value: '1,295',
    icon: ChartBarIcon,
    color: 'text-purple-400'
  }
])

onMounted(() => {
  // Simulate loading
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
})
</script>

<template>
  <div class="min-h-screen bg-dark-950">
    <!-- Navigation -->
    <nav class="bg-dark-900/50 backdrop-blur-sm border-b border-dark-800 px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg flex items-center justify-center">
            <CogIcon class="w-5 h-5 text-white" />
          </div>
          <span class="text-xl font-bold gradient-text">KinkyPolice Dashboard</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <router-link to="/" class="btn btn-ghost btn-sm">
            ← Back to Home
          </router-link>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p class="text-gray-400">Manage your Discord servers and bot configuration</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="space-y-8">
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="stat in stats" 
            :key="stat.label"
            class="card p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm font-medium">{{ stat.label }}</p>
                <p class="text-2xl font-bold text-white mt-1">{{ stat.value }}</p>
              </div>
              <component 
                :is="stat.icon" 
                :class="['w-8 h-8', stat.color]"
              />
            </div>
          </div>
        </div>

        <!-- Servers Section -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-semibold text-white">Your Servers</h2>
            <button class="btn btn-primary btn-sm">
              Add Server
            </button>
          </div>
          
          <div class="space-y-4">
            <div 
              v-for="server in servers" 
              :key="server.id"
              class="flex items-center justify-between p-4 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span class="text-white font-semibold">{{ server.name.charAt(0) }}</span>
                </div>
                <div>
                  <h3 class="text-white font-medium">{{ server.name }}</h3>
                  <p class="text-gray-400 text-sm">{{ server.memberCount }} members</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-4">
                <span class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span class="text-green-400 text-sm">Online</span>
                </span>
                <router-link 
                  :to="`/config?server=${server.id}`"
                  class="btn btn-secondary btn-sm"
                >
                  Configure
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid md:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div class="space-y-3">
              <button class="w-full btn btn-secondary btn-md justify-start">
                <CogIcon class="w-5 h-5 mr-3" />
                Bot Configuration
              </button>
              <button class="w-full btn btn-secondary btn-md justify-start">
                <ShieldCheckIcon class="w-5 h-5 mr-3" />
                Moderation Settings
              </button>
              <button class="w-full btn btn-secondary btn-md justify-start">
                <ChartBarIcon class="w-5 h-5 mr-3" />
                View Analytics
              </button>
            </div>
          </div>
          
          <div class="card p-6">
            <h3 class="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between py-2 border-b border-dark-700">
                <span class="text-gray-300">User warned in #general</span>
                <span class="text-gray-500">2 min ago</span>
              </div>
              <div class="flex items-center justify-between py-2 border-b border-dark-700">
                <span class="text-gray-300">Configuration updated</span>
                <span class="text-gray-500">1 hour ago</span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-gray-300">New member joined</span>
                <span class="text-gray-500">3 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
