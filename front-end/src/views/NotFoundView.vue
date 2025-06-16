<script setup lang="ts">
import { useRouter } from 'vue-router'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-dark-950 flex items-center justify-center px-6">
    <div class="max-w-lg w-full text-center">
      <div 
        v-motion
        :initial="{ opacity: 0, y: 30 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="space-y-8"
      >
        <!-- 404 Animation -->
        <div class="relative">
          <h1 class="text-9xl font-bold text-primary-600/20 select-none">404</h1>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-24 h-24 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
              <span class="text-3xl">🤖</span>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-4">
          <h2 class="text-4xl font-bold text-white">Page Not Found</h2>
          <p class="text-xl text-gray-400 max-w-md mx-auto">
            Oops! The page you're looking for seems to have wandered off into the digital void.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            @click="goHome"
            class="btn btn-primary btn-lg group"
          >
            <HomeIcon class="w-5 h-5 mr-2" />
            <span>Go Home</span>
          </button>
          
          <button 
            @click="goBack"
            class="btn btn-secondary btn-lg group"
          >
            <ArrowLeftIcon class="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </button>
        </div>

        <!-- Helpful Links -->
        <div class="pt-8 border-t border-dark-800">
          <p class="text-gray-500 mb-4">Maybe you were looking for:</p>
          <div class="flex flex-wrap justify-center gap-4 text-sm">
            <router-link to="/" class="text-primary-400 hover:text-primary-300 transition-colors">
              Home
            </router-link>
            <router-link to="/dashboard" class="text-primary-400 hover:text-primary-300 transition-colors">
              Dashboard
            </router-link>
            <router-link to="/docs" class="text-primary-400 hover:text-primary-300 transition-colors">
              Documentation
            </router-link>
            <router-link to="/invite" class="text-primary-400 hover:text-primary-300 transition-colors">
              Invite Bot
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
