<script setup lang="ts">
import { ref } from 'vue'
import { CogIcon, ShieldCheckIcon, ChatBubbleLeftRightIcon, GameController2Icon } from '@heroicons/vue/24/outline'

const activeTab = ref('general')

const tabs = [
  { id: 'general', name: 'General', icon: CogIcon },
  { id: 'moderation', name: 'Moderation', icon: ShieldCheckIcon },
  { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon },
  { id: 'games', name: 'Games', icon: GameController2Icon }
]

const config = ref({
  general: {
    prefix: '/',
    language: 'en',
    timezone: 'UTC'
  },
  moderation: {
    autoMod: true,
    warnThreshold: 3,
    muteRole: null
  },
  messages: {
    welcomeEnabled: true,
    welcomeChannel: null,
    welcomeMessage: 'Welcome {user} to the server!'
  },
  games: {
    economyEnabled: true,
    levelingEnabled: true,
    gamesEnabled: true
  }
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
          <span class="text-xl font-bold gradient-text">Bot Configuration</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <router-link to="/dashboard" class="btn btn-ghost btn-sm">
            ← Back to Dashboard
          </router-link>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid lg:grid-cols-4 gap-8">
        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-8">
            <h3 class="text-lg font-semibold text-white mb-4">Configuration</h3>
            <nav class="space-y-2">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                ]"
              >
                <component :is="tab.icon" class="w-5 h-5" />
                <span>{{ tab.name }}</span>
              </button>
            </nav>
          </div>
        </div>

        <!-- Content -->
        <div class="lg:col-span-3">
          <!-- General Settings -->
          <div v-if="activeTab === 'general'" class="space-y-6">
            <div class="flex items-center space-x-3 mb-8">
              <CogIcon class="w-8 h-8 text-primary-400" />
              <h1 class="text-4xl font-bold text-white">General Settings</h1>
            </div>

            <div class="card p-8">
              <h2 class="text-2xl font-semibold text-white mb-6">Basic Configuration</h2>
              
              <div class="space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Command Prefix</label>
                  <input 
                    v-model="config.general.prefix"
                    type="text" 
                    class="input w-full max-w-xs"
                    placeholder="/"
                  />
                  <p class="text-gray-500 text-sm mt-1">Character used to trigger bot commands</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Language</label>
                  <select v-model="config.general.language" class="input w-full max-w-xs">
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                  <select v-model="config.general.timezone" class="input w-full max-w-xs">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="Europe/Paris">Central European Time</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Moderation Settings -->
          <div v-if="activeTab === 'moderation'" class="space-y-6">
            <div class="flex items-center space-x-3 mb-8">
              <ShieldCheckIcon class="w-8 h-8 text-red-400" />
              <h1 class="text-4xl font-bold text-white">Moderation Settings</h1>
            </div>

            <div class="card p-8">
              <h2 class="text-2xl font-semibold text-white mb-6">Auto Moderation</h2>
              
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">Enable Auto Moderation</h3>
                    <p class="text-gray-400 text-sm">Automatically moderate messages for spam and inappropriate content</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input v-model="config.moderation.autoMod" type="checkbox" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Warning Threshold</label>
                  <input 
                    v-model="config.moderation.warnThreshold"
                    type="number" 
                    class="input w-full max-w-xs"
                    min="1"
                    max="10"
                  />
                  <p class="text-gray-500 text-sm mt-1">Number of warnings before automatic action</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Messages Settings -->
          <div v-if="activeTab === 'messages'" class="space-y-6">
            <div class="flex items-center space-x-3 mb-8">
              <ChatBubbleLeftRightIcon class="w-8 h-8 text-blue-400" />
              <h1 class="text-4xl font-bold text-white">Message Settings</h1>
            </div>

            <div class="card p-8">
              <h2 class="text-2xl font-semibold text-white mb-6">Welcome Messages</h2>
              
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">Enable Welcome Messages</h3>
                    <p class="text-gray-400 text-sm">Send a message when new members join</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input v-model="config.messages.welcomeEnabled" type="checkbox" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div v-if="config.messages.welcomeEnabled">
                  <label class="block text-sm font-medium text-gray-300 mb-2">Welcome Message</label>
                  <textarea 
                    v-model="config.messages.welcomeMessage"
                    class="input w-full h-24 resize-none"
                    placeholder="Welcome {user} to the server!"
                  ></textarea>
                  <p class="text-gray-500 text-sm mt-1">Use {user} to mention the new member</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Games Settings -->
          <div v-if="activeTab === 'games'" class="space-y-6">
            <div class="flex items-center space-x-3 mb-8">
              <GameController2Icon class="w-8 h-8 text-purple-400" />
              <h1 class="text-4xl font-bold text-white">Games & Economy</h1>
            </div>

            <div class="card p-8">
              <h2 class="text-2xl font-semibold text-white mb-6">Game Features</h2>
              
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">Economy System</h3>
                    <p class="text-gray-400 text-sm">Enable currency and shop features</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input v-model="config.games.economyEnabled" type="checkbox" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">Leveling System</h3>
                    <p class="text-gray-400 text-sm">Track user activity and levels</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input v-model="config.games.levelingEnabled" type="checkbox" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-medium">Interactive Games</h3>
                    <p class="text-gray-400 text-sm">Enable fun games and activities</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input v-model="config.games.gamesEnabled" type="checkbox" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="mt-8 flex justify-end">
            <button class="btn btn-primary btn-lg">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
