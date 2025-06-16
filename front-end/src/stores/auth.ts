import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
}

export interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  features: string[]
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const guilds = ref<Guild[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => user.value !== null)
  const userGuilds = computed(() => guilds.value.filter(guild => guild.owner || hasManageGuildPermission(guild)))

  // Actions
  const login = async (code: string) => {
    isLoading.value = true
    error.value = null

    try {
      // TODO: Implement actual OAuth flow
      const response = await fetch('/api/auth/discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()
      user.value = data.user
      guilds.value = data.guilds

      // Store token in localStorage
      localStorage.setItem('auth_token', data.token)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Authentication failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    user.value = null
    guilds.value = []
    localStorage.removeItem('auth_token')
  }

  const fetchUserGuilds = async () => {
    if (!isAuthenticated.value) return

    isLoading.value = true
    try {
      // TODO: Implement actual API call
      const response = await fetch('/api/user/guilds', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch guilds')
      }

      const data = await response.json()
      guilds.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch guilds'
    } finally {
      isLoading.value = false
    }
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    isLoading.value = true
    try {
      // TODO: Implement token validation
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Token invalid')
      }

      const data = await response.json()
      user.value = data.user
      guilds.value = data.guilds
    } catch (err) {
      // Token is invalid, remove it
      localStorage.removeItem('auth_token')
      error.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Helper functions
  const hasManageGuildPermission = (guild: Guild): boolean => {
    const permissions = parseInt(guild.permissions)
    const MANAGE_GUILD = 0x00000020
    return (permissions & MANAGE_GUILD) === MANAGE_GUILD
  }

  return {
    // State
    user,
    guilds,
    isLoading,
    error,
    
    // Getters
    isAuthenticated,
    userGuilds,
    
    // Actions
    login,
    logout,
    fetchUserGuilds,
    checkAuth,
  }
})
