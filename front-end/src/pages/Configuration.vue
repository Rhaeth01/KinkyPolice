<template>
  <div class="space-y-6">
    <!-- Header -->
    <div v-motion-slide-visible-once-top class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Configuration du Bot</h2>
        <p class="text-muted-foreground mt-1">
          Gérez les paramètres et la configuration de votre bot Discord
        </p>
      </div>
      <div class="flex gap-2">
        <button
          @click="saveConfiguration"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Sauvegarder
        </button>
        <button
          @click="resetConfiguration"
          class="px-4 py-2 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Réinitialiser
        </button>
      </div>
    </div>

    <!-- Configuration Tabs -->
    <div v-motion-slide-visible-once-left class="bg-card rounded-lg border border-border">
      <div class="border-b border-border">
        <nav class="flex space-x-8 px-6">
          <button
            v-for="tab in configTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="activeTab === tab.id 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <div class="p-6">
        <!-- General Settings -->
        <div v-if="activeTab === 'general'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Nom du bot</label>
              <input
                v-model="config.general.botName"
                type="text"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Préfixe</label>
              <input
                v-model="config.general.prefix"
                type="text"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Description</label>
            <textarea
              v-model="config.general.description"
              rows="3"
              class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            ></textarea>
          </div>

          <div class="flex items-center space-x-2">
            <input
              v-model="config.general.enableLogging"
              type="checkbox"
              id="enableLogging"
              class="rounded border-border text-primary focus:ring-primary"
            />
            <label for="enableLogging" class="text-sm font-medium text-foreground">
              Activer les logs
            </label>
          </div>
        </div>

        <!-- Moderation Settings -->
        <div v-if="activeTab === 'moderation'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Canal de modération</label>
              <select
                v-model="config.moderation.logChannel"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner un canal</option>
                <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                  {{ channel.name }}
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Rôle de modérateur</label>
              <select
                v-model="config.moderation.moderatorRole"
                class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner un rôle</option>
                <option v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <input
              v-model="config.moderation.autoMod"
              type="checkbox"
              id="autoMod"
              class="rounded border-border text-primary focus:ring-primary"
            />
            <label for="autoMod" class="text-sm font-medium text-foreground">
              Modération automatique
            </label>
          </div>
        </div>

        <!-- Games Settings -->
        <div v-if="activeTab === 'games'" class="space-y-6">
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-foreground">Jeux activés</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="game in availableGames"
                :key="game.id"
                class="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div>
                  <h4 class="font-medium text-foreground">{{ game.name }}</h4>
                  <p class="text-sm text-muted-foreground">{{ game.description }}</p>
                </div>
                <input
                  v-model="config.games.enabled"
                  :value="game.id"
                  type="checkbox"
                  class="rounded border-border text-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- NSFW Settings -->
        <div v-if="activeTab === 'nsfw'" class="space-y-6">
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Contenu pour adultes
                </h3>
                <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Ces paramètres concernent le contenu NSFW. Assurez-vous que votre serveur respecte les conditions d'utilisation de Discord.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex items-center space-x-2">
              <input
                v-model="config.nsfw.enabled"
                type="checkbox"
                id="nsfwEnabled"
                class="rounded border-border text-primary focus:ring-primary"
              />
              <label for="nsfwEnabled" class="text-sm font-medium text-foreground">
                Activer les fonctionnalités NSFW
              </label>
            </div>

            <div v-if="config.nsfw.enabled" class="space-y-4 ml-6">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Canaux NSFW autorisés</label>
                <div class="space-y-2">
                  <div
                    v-for="channel in nsfwChannels"
                    :key="channel.id"
                    class="flex items-center space-x-2"
                  >
                    <input
                      v-model="config.nsfw.allowedChannels"
                      :value="channel.id"
                      type="checkbox"
                      class="rounded border-border text-primary focus:ring-primary"
                    />
                    <span class="text-sm text-foreground">{{ channel.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const activeTab = ref('general')

// Mock configuration data
const config = reactive({
  general: {
    botName: 'KinkyPolice',
    prefix: '!',
    description: 'Bot Discord pour la gestion de communautés NSFW',
    enableLogging: true
  },
  moderation: {
    logChannel: '',
    moderatorRole: '',
    autoMod: true
  },
  games: {
    enabled: ['quiz', 'games']
  },
  nsfw: {
    enabled: true,
    allowedChannels: []
  }
})

const configTabs = [
  { id: 'general', name: 'Général' },
  { id: 'moderation', name: 'Modération' },
  { id: 'games', name: 'Jeux' },
  { id: 'nsfw', name: 'NSFW' }
]

// Mock data
const channels = [
  { id: '1', name: '#général' },
  { id: '2', name: '#modération' },
  { id: '3', name: '#logs' }
]

const roles = [
  { id: '1', name: 'Modérateur' },
  { id: '2', name: 'Admin' },
  { id: '3', name: 'Staff' }
]

const nsfwChannels = [
  { id: '4', name: '#nsfw-général' },
  { id: '5', name: '#confession' }
]

const availableGames = [
  { id: 'quiz', name: 'Quiz', description: 'Quiz interactifs pour les membres' },
  { id: 'games', name: 'Jeux de société', description: 'UNO, Morpion, etc.' },
  { id: 'economy', name: 'Économie', description: 'Système de points et boutique' }
]

const saveConfiguration = () => {
  console.log('Saving configuration...', config)
  // TODO: Implement save logic
}

const resetConfiguration = () => {
  console.log('Resetting configuration...')
  // TODO: Implement reset logic
}
</script>