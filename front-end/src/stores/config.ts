import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface BotConfig {
  general: {
    prefix: string
    language: string
    timezone: string
  }
  moderation: {
    autoMod: boolean
    warnThreshold: number
    muteRole: string | null
    logChannel: string | null
  }
  messages: {
    welcomeEnabled: boolean
    welcomeChannel: string | null
    welcomeMessage: string
    goodbyeEnabled: boolean
    goodbyeChannel: string | null
    goodbyeMessage: string
  }
  games: {
    economyEnabled: boolean
    levelingEnabled: boolean
    gamesEnabled: boolean
  }
  entry: {
    enabled: boolean
    requestChannel: string | null
    welcomeChannel: string | null
    rulesChannel: string | null
    verificationRole: string | null
    entryCategory: string | null
    modalTitle: string
    modalFields: Array<{
      customId: string
      label: string
      style: 'Short' | 'Paragraph'
      required: boolean
      placeholder?: string
    }>
  }
  logging: {
    modLogs: string | null
    messageLogs: string | null
    voiceLogs: string | null
    memberLogs: string | null
    roleLogChannelId: string | null
  }
}

export const useConfigStore = defineStore('config', () => {
  // State
  const configs = ref<Record<string, BotConfig>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentGuildId = ref<string | null>(null)

  // Actions
  const fetchConfig = async (guildId: string) => {
    isLoading.value = true
    error.value = null

    try {
      // TODO: Implement actual API call
      const response = await fetch(`/api/guilds/${guildId}/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch configuration')
      }

      const config = await response.json()
      configs.value[guildId] = config
      currentGuildId.value = guildId
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch configuration'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateConfig = async (guildId: string, config: Partial<BotConfig>) => {
    isLoading.value = true
    error.value = null

    try {
      // TODO: Implement actual API call
      const response = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Failed to update configuration')
      }

      const updatedConfig = await response.json()
      configs.value[guildId] = updatedConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update configuration'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getConfig = (guildId: string): BotConfig | null => {
    return configs.value[guildId] || null
  }

  const getCurrentConfig = (): BotConfig | null => {
    if (!currentGuildId.value) return null
    return getConfig(currentGuildId.value)
  }

  // Default configuration
  const getDefaultConfig = (): BotConfig => ({
    general: {
      prefix: '/',
      language: 'en',
      timezone: 'UTC'
    },
    moderation: {
      autoMod: false,
      warnThreshold: 3,
      muteRole: null,
      logChannel: null
    },
    messages: {
      welcomeEnabled: false,
      welcomeChannel: null,
      welcomeMessage: 'Welcome {user} to the server!',
      goodbyeEnabled: false,
      goodbyeChannel: null,
      goodbyeMessage: 'Goodbye {user}!'
    },
    games: {
      economyEnabled: false,
      levelingEnabled: false,
      gamesEnabled: false
    },
    entry: {
      enabled: false,
      requestChannel: null,
      welcomeChannel: null,
      rulesChannel: null,
      verificationRole: null,
      entryCategory: null,
      modalTitle: 'Entry Request',
      modalFields: []
    },
    logging: {
      modLogs: null,
      messageLogs: null,
      voiceLogs: null,
      memberLogs: null,
      roleLogChannelId: null
    }
  })

  return {
    // State
    configs,
    isLoading,
    error,
    currentGuildId,
    
    // Actions
    fetchConfig,
    updateConfig,
    getConfig,
    getCurrentConfig,
    getDefaultConfig,
  }
})
