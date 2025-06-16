<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const isLoading = ref(true)
const isSuccess = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    // Simulate authentication process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // TODO: Handle actual OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error_param = urlParams.get('error')
    
    if (error_param) {
      throw new Error('Authentication failed')
    }
    
    if (code) {
      // TODO: Exchange code for token
      isSuccess.value = true
      
      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } else {
      throw new Error('No authorization code received')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed'
    isSuccess.value = false
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-dark-950 flex items-center justify-center px-6">
    <div class="max-w-md w-full">
      <div class="card p-8 text-center">
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-6">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto"></div>
          <h2 class="text-2xl font-semibold text-white">Authenticating...</h2>
          <p class="text-gray-400">Please wait while we verify your Discord account.</p>
        </div>

        <!-- Success State -->
        <div v-else-if="isSuccess" class="space-y-6">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckIcon class="w-8 h-8 text-white" />
          </div>
          <h2 class="text-2xl font-semibold text-white">Authentication Successful!</h2>
          <p class="text-gray-400">You will be redirected to the dashboard shortly.</p>
        </div>

        <!-- Error State -->
        <div v-else class="space-y-6">
          <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
            <XMarkIcon class="w-8 h-8 text-white" />
          </div>
          <h2 class="text-2xl font-semibold text-white">Authentication Failed</h2>
          <p class="text-gray-400">{{ error }}</p>
          <div class="space-y-3">
            <button @click="router.push('/')" class="btn btn-primary btn-md w-full">
              Return Home
            </button>
            <button @click="window.location.reload()" class="btn btn-secondary btn-md w-full">
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
